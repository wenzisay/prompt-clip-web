# Spec: 列表页性能优化 — DOM 虚拟化 + 延迟读全文

## Objective

在 PromptClip 中改造列表页加载与渲染链路，使其在中大规模数据下保持流畅。具体引入两项能力：

1. **DOM 虚拟化**：用 `@tanstack/react-virtual` 改造 `PromptGrid`，只渲染可视区域的 `PromptCard`，消除一次性挂载上千 DOM 节点的卡顿。
2. **延迟读全文**：首屏只解析每个文件头部以获取 frontmatter 和预览片段，正文 (`content`) 由后台 `requestIdleCallback` 分批补全；FlexSearch 全文索引随后台加载渐进式构建。

目标用户是在本地维护数千条 Prompt（量级 1–5K）的个人用户。成功状态是：在 5000 条 prompt 的工作区下，首次可交互时间 < 2 秒，可见区域立即可滚动浏览且滚动保持 60 fps，搜索能力在后台索引完成后无缝升级为全文匹配。

### 验收标准

- 5000 条 prompt 工作区下，从授权目录到列表可滚动 < 2s（首次冷启动 / 已授权热启动皆达成）。
- 列表滚动期间，主线程长任务 < 50ms / 帧，整体 60 fps（Chrome DevTools Performance 抽样确认）。
- DOM 中 `PromptCard` 实例数 ≤ 当前视窗可见行数 × 列数 + 上下 overscan 2 行，与列表总长度无关。
- 列表挂载 → 用户可点击/编辑/复制单条 prompt 之间无功能丢失：详情、复制、导出、分享、历史版本等所有使用 `prompt.content` 的路径，在 content 未加载时按需触发加载并完成操作。
- 搜索：在后台索引完成前，搜索可命中 `title` 和 `tags`；索引完成后自动覆盖全文匹配。索引构建过程不阻塞用户交互。
- 切换 workspace、关闭页面时，后台延迟加载任务能被取消，不产生竞态错误。
- 现有测试套件（`npm run test`、`npm run type-check`、`npm run lint`）全部通过；新增的服务/store/组件具备对应单元测试。
- 现有 `.md` 文件格式不变；frontmatter 字段与 stable id 迁移逻辑保持兼容。

### 非目标

- 不做 FlexSearch 索引持久化（已在 `TODO.md`，属独立任务）。
- 不做文件系统变更监听 / 自动刷新（已在 `TODO.md`）。
- 不保留小数据量下的非虚拟化代码路径，统一走虚拟化。
- 不改 `.md` 文件存储格式或 frontmatter schema。
- 不做并发或批量删除性能优化（独立任务）。

## Tech Stack

- React 18.3 + TypeScript 5.6（strict / `noUnusedLocals` / `noUnusedParameters`）
- Zustand 5，扩展现有 `promptStore`
- `@tanstack/react-virtual` ^3（新引入，约 5KB gzipped，headless）
- FlexSearch 0.7（沿用）
- File System Access API（Web）/ Tauri v2 文件系统（桌面端）— 通过 `FileRepository` 抽象统一访问
- Vitest 2.1 + 现有 jsdom 测试环境

## Commands

沿用现有命令，不新增：

```bash
npm run dev          # 开发服务器 (localhost:5173)
npm run build        # tsc 类型检查 + Vite 构建
npm run type-check   # 仅类型检查
npm run lint         # ESLint
npm run test         # Vitest
npm run test:ui      # Vitest UI
```

新增依赖：

```bash
npm install @tanstack/react-virtual
```

## Project Structure

新增与改动的文件（保持现有目录约定，不引入新目录）：

```
src/
├── types/
│   └── prompt.ts                          # 修改：Prompt 增加 preview/isContentLoaded
├── services/
│   ├── promptService.ts                   # 修改：loadPrompts 改为 head-only 解析；新增 ensureContent
│   ├── promptLazyLoader.ts                # 新增：idle 调度，分批补全 content 并喂索引
│   ├── searchService.ts                   # 修改：支持只索引 title+tags 的快速模式 + 渐进式补全 content 索引
│   └── fileRepository/
│       ├── types.ts                       # 修改：FileRepository 新增可选 readTextHead(path, byteLimit)
│       ├── webFileRepository.ts           # 修改：实现 readTextHead（File.slice + text）
│       ├── tauriFileRepository.ts         # 修改：实现 readTextHead（按字节读取或 fallback 全读）
│       └── fakeFileRepository.ts          # 修改：实现 readTextHead（默认基于内存数据）
├── stores/
│   └── promptStore.ts                     # 修改：setPrompts 不再阻塞索引；新增 patchPromptContent action
├── hooks/
│   ├── usePromptLoader.ts                 # 修改：两阶段流程（head → background fill）
│   ├── usePromptLazyLoad.ts               # 新增：管理 idle 加载生命周期 / 取消
│   └── useResponsiveColumnCount.ts        # 新增：测量 PromptGrid 容器宽度，得出当前列数
├── components/prompt/
│   ├── PromptGrid.tsx                     # 改造：用 @tanstack/react-virtual 做行级虚拟化
│   └── PromptCard.tsx                     # 修改：使用 prompt.preview；React.memo 包裹
└── utils/
    └── markdown.ts                        # 修改：导出 parseFrontmatterOnly（仅解析 frontmatter，不处理正文）

specs/
└── annotation.md                          # 旧 SPEC 归档（如需保留）
```

### 数据模型变更

`Prompt` 接口新增两个字段：

```typescript
interface Prompt {
  // …existing fields…
  /** 卡片预览（首屏即填充，最多 4 行 / 120 字符，独立于 content） */
  preview: string;
  /** 标记 content 是否已加载到完整正文；false 表示 content 为空串且需调用 ensureContent */
  isContentLoaded: boolean;
}
```

约束：
- `preview` 始终非空（即使空文件也填空串），列表渲染**只读 preview**，永不读 content。
- `content` 在 `isContentLoaded === false` 时为空串 `""`；任何会使用 content 的入口（详情面板、复制、导出、分享、历史版本、CreateModal 编辑态）必须先 `await PromptService.ensureContent(prompt)`，拿回填充好的 Prompt 再使用。
- `ensureContent` 内部缓存并幂等：重复调用同一 prompt 不会重复读盘。

### 两阶段加载流程

阶段 1（首屏，目标 < 2s @ 5K 文档）：
1. `repository.listFiles(workspace)` 列出所有 `.md` 文件。
2. 并发（concurrency=20）对每个文件调用 `repository.readTextHead(path, 8192)` 读取前 8 KB。
3. 解析 frontmatter（`parseFrontmatterOnly`），从头部正文截取 `preview`（沿用 `getPromptPreview` 的 4 行 / 120 字符规则）。
4. 极少数文件的 frontmatter > 8 KB：识别后回退到 `readText` 全读（边界处理，预计 < 1%）。
5. 完成 stable id 迁移所需的字段计算（与现状一致，写回操作可保留在阶段 1 末尾，但每次写回都是单文件 IO，整体可承受）。
6. 构建 prompts 数组（`isContentLoaded = false`）→ `promptStore.setPrompts` → `SearchService.buildIndex({ skipContent: true })` 只索引 title+tags（快速）→ 列表立即可见。

阶段 2（idle，后台进行）：
1. `promptLazyLoader.start(prompts)` 启动调度，使用 `requestIdleCallback`（带 setTimeout fallback）分批（每批 50 条）。
2. 每批：并发读全文 → `promptStore.patchPromptContent(id, content)` → `SearchService.addContentToIndex(id, content)`。
3. 切换 workspace、清空 prompts、组件卸载时调用 `lazyLoader.cancel()`，已发出的 IO 用 `AbortController` 中止（Web 端 `getFile()` 不可中止，则用 generation 标记丢弃结果）。
4. 全部完成后置位 `promptStore.contentLoadingState = 'complete'`，搜索 UI 可去除"索引构建中"提示。

### 搜索行为

- `SearchService` 拆为 `titleIndex` / `tagsIndex`（首屏即建好）和 `contentIndex`（延迟分批添加）。
- 公共 `search(query, limit)` 内部合并三索引结果；当 `contentIndex` 未完成时也返回有效的 title/tag 命中。
- 不引入新的"模式"参数，调用方无需感知阶段差异。

### 虚拟化策略

- `PromptGrid` 不再直接 `.map`，改为：
  1. `useResponsiveColumnCount(containerRef)` 通过 `ResizeObserver` 计算当前列数（基于现有 CSS `minmax(min(360px,100%),1fr)` 规则在 JS 中复算）。
  2. 把一维 prompts 数组按列数切成行，行数 = `Math.ceil(filteredPrompts.length / columnCount)`。
  3. `useVirtualizer({ count: rowCount, estimateSize: () => 180, overscan: 2, getScrollElement: () => scrollRef.current })`，开启 `measureElement` 动态测量真实行高。
  4. 滚动容器：复用现有页面级滚动容器（在 `MainLayout` 中找到现有 main scroll element）或为 PromptGrid 自身包一层 `overflow-y-auto`。SPEC 阶段默认采用**包裹层滚动**，避免影响 `Sidebar` / `TopBar` 等 fixed 布局；如包裹层方案导致视觉/键盘交互问题，回退到 window 级 `useWindowVirtualizer`。
- `FilterTabs` 与"批量操作工具条"保持在 sticky 头部，与虚拟化区域兄弟节点关系。
- `PromptCard` 用 `React.memo` 包裹，props 仅 `prompt`，加 `arePropsEqual` 比较 `prompt.id + updatedAt + pinned + copyCount + isContentLoaded`（preview/tags 由 updatedAt 反映）。

## Code Style

沿用项目既有约定（详见 `CLAUDE.md`），关键点：

- 文件命名：组件 `PascalCase.tsx`、服务/store/hook/utils `camelCase.ts`。
- 函数式组件 + 命名导出（`App.tsx` 除外）。
- 路径别名：跨模块用 `@/`；同模块用相对路径。
- Service 层：无状态模块，导出独立函数 + 一个 `as const` 冻结对象（如 `PromptLazyLoader`）。
- Store 层：Zustand v5，遵循 `数据 / UI状态 / Actions` 三段式；新增的 `patchPromptContent` 必须不触发 `applyFilter`（避免列表抖动）。
- 样式：Tailwind utility class；不引入 CSS Modules / CSS-in-JS。
- TypeScript：strict；新增类型必须显式（避免隐式 `any`）；`Prompt` 字段为必填，序列化/反序列化时由 `PromptService` 负责设默认值。
- 注释：默认不加；只为非显而易见的"为什么"加单行注释（例如：解释为何需要 `generation` 标记丢弃过期结果）。
- 翻译：所有新增用户可见文字（如"索引构建中..."）必须通过 `src/i18n/messages.ts` 同时添加 `zh-CN` / `zh-TW` / `en-US` 三套。
- Barrel 文件：新增模块时更新对应 `index.ts` 的 re-export。

## Testing Strategy

测试与源文件同目录，命名 `*.test.ts` / `*.test.tsx`，使用 Vitest。

### 单元测试（必须）

1. `promptService.test.ts`
   - `loadPrompts` head-only 解析：构造 fake repository 返回大文件，断言只读头部、preview 截断正确、`isContentLoaded === false`。
   - `loadPrompts` 边界：frontmatter > 8KB 时回退全读，preview 正确。
   - `ensureContent`：未加载时触发读盘，已加载时不重复读；并发调用合并为单次 IO（用 mock repository 计数）。
   - stable id 迁移在 head-only 模式下仍能正确写回。
2. `promptLazyLoader.test.ts`（新增）
   - 分批调度：100 条 prompts 在 mock requestIdleCallback 下按批触发。
   - 取消：`cancel()` 后续批次不再执行；已发出的批不会写入 store。
   - generation：workspace 切换后旧批结果被丢弃。
3. `searchService.test.ts`
   - 仅 title+tags 索引时，搜索能命中 title / tag，但不命中正文 substring。
   - `addContentToIndex` 增量加入后，相同 query 能命中正文。
4. `promptStore.test.ts`
   - `setPrompts` 后 `filteredPrompts` 立即可用，不需要等 content。
   - `patchPromptContent` 更新单条 prompt 的 content 与 `isContentLoaded`，不改变排序、不触发 `filteredPrompts` 重排。
5. `webFileRepository.test.ts` / `tauriFileRepository.test.ts`
   - `readTextHead` 返回前 N 字节解码字符串；超出文件长度时返回全文。

### 组件测试（必须）

6. `PromptGrid.test.tsx`（改造或新增）
   - 给定 1000 条 prompt + 模拟容器高度 600px，断言渲染的 `PromptCard` 数量受 overscan 限制（< 20 张），而非 1000 张。
   - 列数计算：mock `ResizeObserver` 模拟不同宽度，断言行数符合预期。
7. `PromptCard.test.tsx`
   - 卡片仅依赖 `prompt.preview`，content 为空也能正常渲染预览。
   - 复制按钮在 `isContentLoaded === false` 时触发 `ensureContent` 后再写入剪贴板（mock PromptService）。
8. `DetailPanel.test.tsx`
   - 打开未加载 content 的 prompt 时，自动触发 `ensureContent`，加载完成后正常展示正文。

### 集成 / 手工验证（建议）

- 在 dev server 用 fake repository 注入 5000 条样例 prompt，使用 Chrome DevTools Performance 录制：
  - 首次列表可见时间 < 2s。
  - 滚动 main thread long tasks < 50ms / 帧。
  - 后台 idle 阶段 CPU 占用不超过 50%（不影响交互）。
- 切换 workspace、快速翻页搜索、复制 / 编辑 / 收藏，验证后台加载被正确中止/继续。

## Out of Scope（边界）

**必须做**
- 所有依赖 `prompt.content` 的入口接入 `ensureContent`（详情、复制、导出、分享、历史版本、编辑态）。
- 三套 i18n 同步更新。
- `webFileRepository` 实现真实的 `readTextHead`（不能简单 fallback 到 readText，否则失去优化意义）。
- `PromptCard` `React.memo` 化。

**需先确认（落地阶段提出）**
- `tauriFileRepository.readTextHead` 在 Tauri v2 文件系统 API 下是否能真正按字节读取；若 Tauri 端只能全读，需评估桌面端是否仍能达到 < 2s 目标，或接受桌面端略慢于 Web。
- 滚动容器选择（包裹层 vs window）：阶段 1 用包裹层，若键盘 PageUp/Down、`scrollTo selectedPrompt` 等现有交互被破坏，再切回 window 级。
- stable id 迁移是否完整保留在阶段 1。若 5K 工作区中含大量需迁移文件，写回时间可能超过 2s 预算，届时改为"读阶段不迁移、idle 阶段写回"的策略。

**绝不做**
- 不引入新的虚拟化抽象层 / 自研虚拟列表。
- 不引入 Web Worker 做解析（除非性能基准证明必要，避免增加复杂度）。
- 不更改 `.md` 文件存储格式 / frontmatter schema。
- 不删除或重写现有的 FlexSearch 索引结构。
- 不保留旧的 `PromptGrid` 非虚拟化代码路径作为 fallback。
- 不增加额外的 LocalStorage / IndexedDB 持久化（索引持久化属另一个 TODO）。
