# Implementation Plan: 列表页性能优化（DOM 虚拟化 + 延迟读全文）

对应 `SPEC.md`。按"自下而上"顺序：先夯实 IO 与数据层，再加后台调度，再接入消费方，最后做 UI 虚拟化与全量验证。

## 阶段 1: head-only IO 与数据模型

**目标**: 让文件仓库能按字节读取头部；`Prompt` 携带 `preview` 与 `isContentLoaded`；`PromptService.loadPrompts` 改为只读 8KB 头部解析 frontmatter + 预览，并提供 `ensureContent` 按需补全正文。

**成功标准**:
- `FileRepository.readTextHead(workspace, path, byteLimit)` 在三端（web / tauri / fake）均能正确返回前 N 字节解码后的字符串；文件长度不足时返回全文。
- `parseFrontmatterOnly(headText)` 仅解析 frontmatter，返回 `metadata` 与正文起始位置；frontmatter 不完整（如截断在 `---` 之前）时显式返回 `incomplete: true`。
- `Prompt` 新增 `preview: string`、`isContentLoaded: boolean`；`loadPrompts` 后 `isContentLoaded === false`，`content === ''`，`preview` 按 4 行 / 120 字符规则截断（沿用 `getPromptPreview` 语义）。
- `PromptService.ensureContent(prompt)` 幂等：未加载时读全文并返回带完整 `content` 的新 Prompt；已加载时直接返回原 prompt；并发调用同一 prompt 合并为单次 IO（用 in-flight map 缓存 Promise）。
- 边界：head 解析判定 `incomplete` 时回退到 `readText` 全读。
- stable id 迁移在 head-only 模式下仍能写回 frontmatter（不需要原始正文，因为 metadata + content="" 重新 serialize 会丢正文 → 此处必须保留：迁移路径仍走全读，普通路径走 head；二者分支决策见 SPEC「需先确认」第 3 项，本阶段默认实现"需要写回时回退全读"）。

**测试**:
- `webFileRepository.test.ts`: `readTextHead` 返回前 N 字节；文件 < N 时返回全文；UTF-8 多字节字符不被截半（最少不抛错，允许末尾被截）。
- `fakeFileRepository.test.ts`: `readTextHead` 实现。
- `utils/markdown.test.ts`（如无则新建）: `parseFrontmatterOnly` 解析完整/不完整 frontmatter。
- `promptService.test.ts`: `loadPrompts` 在 mock repository 下只调用 `readTextHead` 不调用 `readText`（除非需要写回 ID）；`preview` 截断正确；`isContentLoaded === false`；`ensureContent` 幂等与并发合并。

**状态**: 已完成

---

## 阶段 2: 后台延迟加载与渐进式索引

**目标**: 首屏 `setPrompts` 不阻塞索引；title+tags 索引立即可用；正文与 content 索引由 `requestIdleCallback` 分批补全；workspace 切换可安全取消。

**成功标准**:
- `SearchService` 内部拆分：`titleIndex` / `tagsIndex` 在 `buildSearchIndex` 中立即填充；`contentIndex` 在 `buildSearchIndex(prompts, { skipContent: true })` 时为空，由后续 `addContentToIndex(id, content)` 增量填充。`search()` 行为兼容（合并三索引）。
- `promptStore` 新增 `patchPromptContent(id, content)` action：更新单条 prompt 的 `content` 与 `isContentLoaded = true`；**不触发 `applyFilter`**，不改变 `filteredPrompts` 引用顺序。
- 新增 `services/promptLazyLoader.ts`：`start(prompts, { repository, workspace, batchSize=50 })` 用 `requestIdleCallback`（带 `setTimeout(0)` fallback）分批调用 `ensureContent` + `patchPromptContent` + `SearchService.addContentToIndex`；`cancel()` 立即停止后续批次；进行中的批次结果通过 generation 标记丢弃。
- 新增 `hooks/usePromptLazyLoad.ts`：在 prompts 数组就绪后启动 loader，组件卸载或 workspace 切换时 cancel。
- `usePromptLoader` 改造为两阶段：先 head-only `loadPrompts` → `setPrompts` → 立即返回；然后由 `usePromptLazyLoad` 启动 idle 填充。
- 后台填充期间用户操作（搜索、切筛选、复制、编辑、收藏）不被阻塞。

**测试**:
- `searchService.test.ts`: `skipContent` 模式下 title/tag 命中、content 不命中；`addContentToIndex` 后正文命中生效。
- `promptStore.test.ts`: `patchPromptContent` 更新 `content` 与 `isContentLoaded`，不改变 `filteredPrompts` 顺序与引用项数。
- `promptLazyLoader.test.ts`（新建）: 用 fake timer + mock `requestIdleCallback` 验证分批；`cancel()` 后续批不再执行；workspace 切换时旧 generation 结果被丢弃。

**状态**: 已完成

---

## 阶段 3: content 消费方接入 ensureContent

**目标**: 所有依赖 `prompt.content` 的用户路径，在 content 未加载时透明触发 `ensureContent`。

**成功标准**:
- `PromptCard.handleCopy`：复制前 `ensureContent` 并把更新后的 prompt 写回 store（避免下次再读）。
- `DetailPanel`：选中 prompt 后若 `!isContentLoaded`，在 effect 中触发 `ensureContent`，渲染 loading 占位（复用现有 Spinner / skeleton）；复制、字符数计算用更新后的 content。
- `CreateModal`（编辑态）：打开时若 `!isContentLoaded`，先 ensure 再填入 textarea。
- `exportService.exportPrompts`：调用方（`ExportModal`）在导出前批量 `ensureContent` 选中 prompts。
- `shareImageService` / `ShareCardPreview`：分享渲染前 `ensureContent`。
- 历史版本路径（`HistoryModal`）使用的是 `HistoryVersion.content`，与本次改动正交，不需要改。但 `createHistoryVersion` 内部读 `prompt.filePath` 全文存档，原逻辑已经走 `repository.readText`，**保持不变**。

**测试**:
- `PromptCard.test.tsx`: 在 `isContentLoaded=false` 下点复制，断言 `PromptService.ensureContent` 被调用，剪贴板写入完整内容，store 中该 prompt 已 patch。
- `DetailPanel.test.tsx`: 选中未加载 prompt 后异步加载并展示正文。
- `CreateModal.test.tsx`: 编辑态触发 ensureContent 后填入 textarea。
- `ExportModal.test.tsx`: 导出前对选中未加载 prompts 触发批量 ensureContent。

**状态**: 已完成

---

## 阶段 4: 虚拟化 PromptGrid

**目标**: 用 `@tanstack/react-virtual` 改造 `PromptGrid`，DOM 中 `PromptCard` 实例数仅受视窗约束；`PromptCard` `React.memo` 化，单条更新不触发全列表重渲染。

**成功标准**:
- 安装依赖：`npm install @tanstack/react-virtual`。
- 新增 `hooks/useResponsiveColumnCount.ts`：基于 `ResizeObserver` 测量容器宽度，按 `minmax(min(360px,100%),1fr)` 规则推导列数，返回 `(containerRef, columnCount)`。
- 改造 `PromptGrid.tsx`：用包裹层 `overflow-y-auto` 作为滚动容器；`useVirtualizer({ count: rowCount, estimateSize: () => 180, overscan: 2, measureElement })`；按列数把一维 `filteredPrompts` 切行渲染；FilterTabs + 批量工具条保持 sticky。
- `PromptCard.tsx`：`React.memo` 包裹；卡片预览来源改为 `prompt.preview`（不再 `useMemo(getPromptPreview(content))`）；保留对外的 `getPromptPreview` 导出（供 service 复用）。
- 现有键盘交互（Up/Down 选中卡片、滚动到选中项）若被破坏，先记录在 SPEC「需先确认」第 2 项，回退到 `useWindowVirtualizer` 在后续阶段处理。

**测试**:
- `PromptGrid.test.tsx`: 注入 1000 条 prompt + 模拟容器尺寸（mock `getBoundingClientRect` + `ResizeObserver`），断言渲染的 `PromptCard` 数量 ≤ (rows-in-view + overscan*2) × columnCount，远少于 1000。
- `PromptCard.test.tsx`: 切换某条 prompt 的 `pinned` 后，其它卡片实例不应被重渲染（用 render counter mock 验证 `memo` 生效）。
- 视觉/手工：5K mock 数据下滚动顺畅。

**状态**: 已完成

---

## 阶段 5: i18n + 完整验证

**目标**: 补齐三套 i18n；通过全套质量门禁；用 fake repository 注入 5K mock prompts 做性能验证。

**成功标准**:
- `src/i18n/messages.ts` 新增"内容加载中..."、"全文索引构建中..."等本阶段引入的用户可见文案，覆盖 `zh-CN` / `zh-TW` / `en-US`。
- `npm run lint`、`npm run type-check`、`npm run test`、`npm run build` 全部通过，无新增 warning。
- 在 dev server 用 fake repository 注入 5000 条 prompts，Chrome DevTools Performance 录制：
  - 首次列表可见 ≤ 2s。
  - 滚动期间主线程 long task < 50ms / 帧。
  - 后台 idle 填充期间不阻塞交互（搜索、点击、滚动均流畅）。
- 在记录中确认 SPEC「需先确认」三处的最终处理：Tauri `readTextHead` 实现策略 / 滚动容器选择 / stable id 迁移阶段归属，必要时回写 SPEC。

**状态**: 已完成
