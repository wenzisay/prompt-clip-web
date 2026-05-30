# Spec: 笔记分享图片

## Objective

在 PromptClip 中新增“分享图片”功能，让用户可以从单条笔记的下拉菜单中打开分享面板，将当前笔记渲染为排版精美的图片卡片，并支持下载 PNG、复制图片到剪贴板、右键保存。

目标用户是已经在本地管理提示词或笔记的 PromptClip 用户。成功状态是用户不需要离开应用，就能选择模板、调整展示项，并生成适合社交平台或文档分享的图片。

验收标准：

- 每条笔记的更多操作菜单中新增“分享”入口。
- 点击“分享”后打开分享图片弹窗，展示可实时预览的图片卡片。
- 首版提供 3 种模板：极简白、深色、淡彩边框。
- 图片卡片宽度固定为 800px，高度随笔记内容自动扩展。
- 分享内容最多使用笔记正文前 2000 个字符；超出时截断并显示省略提示。
- 可选项包括：显示作者信息、显示 PromptClip 标志、显示笔记标签、渲染 Markdown。
- 作者信息只包含作者名称，并可在设置页面中配置。
- 底部不显示统计、日期、天数等参考图中的文字；右下角可保留淡色 PromptClip logo。
- 用户可以下载 PNG、复制图片到剪贴板，也可以直接右键保存预览图片。
- 用户可见文案需要覆盖现有多语言体系，至少补齐简体中文、繁体中文与英文。

## Tech Stack

- React 18.3 + TypeScript 5.6
- Zustand 5，用于设置项和 UI 状态
- Tailwind CSS 3.4，用于组件样式
- Vitest 2.1，用于单元和组件测试
- 可新增图片生成依赖，优先选择 `html-to-image`，用于将 DOM 预览节点导出为 PNG Blob/Data URL

## Commands

```bash
npm run dev
npm run type-check
npm run lint
npm run test
npm run build
```

如新增依赖，使用：

```bash
npm install html-to-image
```

## Project Structure

```text
src/types/
  share.ts                  # 分享模板、分享选项等类型

src/constants/
  shareTemplates.ts         # 内置模板配置

src/assets/
  promptclip-share-logo.png # 由 docs/icon.png 预处理得到的小尺寸分享 logo

src/services/
  shareImageService.ts      # DOM 转 PNG、下载、复制剪贴板
  shareImageService.test.ts

src/stores/
  settingsStore.ts          # 增加作者名称设置，并持久化
  uiStore.ts                # 如现有 modal 模式适合，增加 share modal 状态

src/components/prompt/
  PromptCard.tsx            # 笔记菜单增加“分享”入口

src/components/share/
  ShareImageModal.tsx       # 分享弹窗和操作区
  ShareCardPreview.tsx      # 图片卡片预览
  ShareTemplatePicker.tsx   # 模板选择
  ShareImageOptions.tsx     # 展示项开关
  index.ts

src/components/settings/
  SettingsModal.tsx         # 增加作者名称设置项

src/i18n/
  messages.ts               # 新增用户可见中文/现有语言文案
```

目录新增后必须更新对应 barrel 文件。

## Code Style

遵循项目现有 TypeScript/React 约定：

- 组件使用函数式组件和命名导出。
- Props 接口定义在组件文件内，并 export type。
- 跨模块导入使用 `@/` 路径别名。
- 用户可见文字接入现有 i18n 消息结构，至少补齐简体中文、繁体中文和英文。
- 共享状态放在 Zustand store；图片导出等副作用放在 service 层。
- 不引入后端、数据库或路由。

示例风格：

```tsx
export interface ShareImageOptionsProps {
  options: ShareImageOptions;
  onChange: (options: ShareImageOptions) => void;
}

export function ShareImageOptionsPanel({ options, onChange }: ShareImageOptionsProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between gap-4 text-sm text-fg">
        <span>显示作者信息</span>
        <input
          type="checkbox"
          checked={options.showAuthor}
          onChange={(event) => onChange({ ...options, showAuthor: event.target.checked })}
          className="h-4 w-4 accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-4 text-sm text-fg">
        <span>渲染 Markdown</span>
        <input
          type="checkbox"
          checked={options.renderMarkdown}
          onChange={(event) => onChange({ ...options, renderMarkdown: event.target.checked })}
          className="h-4 w-4 accent-accent"
        />
      </label>
    </div>
  );
}
```

## Testing Strategy

测试遵循 RED/GREEN TDD：

- 先为设置持久化、分享服务和关键组件行为补测试，再实现。
- 测试行为，不测试内部实现细节。
- 测试文件与源文件同目录，命名为 `*.test.ts` 或 `*.test.tsx`。
- 不依赖真实浏览器下载行为、外部网络或随机值。

建议测试：

- `settingsStore.test.ts`：作者名称默认值、设置更新、持久化 partialize 范围。
- `shareImageService.test.ts`：成功生成 PNG、下载时创建文件名、Clipboard API 不可用时返回明确错误。
- `ShareCardPreview.test.tsx`：不同选项下作者、标签、logo、Markdown 渲染的显示/隐藏。
- `ShareCardPreview.test.tsx`：正文超过 2000 字时截断，并保留明确的省略提示。
- `PromptCard.test.tsx`：更多菜单中出现“分享”，点击后打开分享弹窗。
- `SettingsModal.test.tsx`：可编辑并保存作者名称。
- `messages.test.ts`：新增分享功能文案在简体中文、繁体中文、英文中键位完整。

验证命令：

```bash
npm run test
npm run type-check
npm run lint
npm run build
```

## Boundaries

- Always:
  - 遵循现有架构依赖方向：types → constants → utils → services → stores → hooks → components。
  - 分享图片功能必须完全在前端完成。
  - 图片卡片宽度固定为 800px，高度根据内容自动扩展。
  - 分享正文最多 2000 个字符，超出后截断。
  - 默认使用 Markdown 渲染后的内容生成分享卡片；用户可以关闭 Markdown 渲染改用纯文本。
  - 右下角 logo 基于 `docs/icon.png` 预处理为小尺寸资源后使用，并保持淡色，不显示参考图底部统计文字。
  - 新增用户可见文字必须与现有 i18n 结构保持一致，至少覆盖简体中文、繁体中文和英文。
  - 分享弹窗不记住用户上次选择的模板和展示项；关闭后恢复默认选项。
  - 实现前先写失败测试，实现后运行测试、类型检查、lint 和 build。

- Ask first:
  - 增加除 `html-to-image` 之外的运行时依赖。
  - 引入新的 UI 组件库、状态库或样式方案。
  - 改变笔记数据模型或 Markdown 文件格式。
  - 将分享设置写入笔记文件本身。
  - 持久化分享弹窗的模板或展示项选择。
  - 增加自定义模板编辑器、云端分享、二维码或外链分享。

- Never:
  - 不引入后端、数据库或远程上传。
  - 不把笔记内容发送到外部服务。
  - 不跳过或禁用现有测试。
  - 不静默吞掉图片生成、下载、复制失败；需要给用户明确反馈。
  - 不移除现有菜单、复制、收藏、编辑、删除等行为。

## Success Criteria

- 用户可以从笔记卡片下拉菜单进入分享图片弹窗。
- 分享弹窗中可以切换 3 种模板，并实时看到当前笔记对应的图片预览。
- 设置页中可以设置作者名称；开启“显示作者信息”后，卡片左上角展示该名称。
- 用户可以切换作者信息、PromptClip 标志、笔记标签、Markdown 渲染的显示状态。
- 分享正文默认使用 Markdown 渲染效果；关闭后使用纯文本换行展示。
- 分享正文超过 2000 字时被截断，并显示省略提示。
- PNG 下载文件可打开，内容与预览一致。
- 在支持 Clipboard API 的浏览器中，复制图片可用；不支持时显示明确错误。
- 预览图片可右键保存。
- `npm run test`、`npm run type-check`、`npm run lint`、`npm run build` 通过。

## Open Questions

- 暂无。已确认：logo 基于 `docs/icon.png`，分享选项不持久化，超长正文按 2000 字截断。
