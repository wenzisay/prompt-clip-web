# Spec: Prompt 批注功能

## Objective

在 PromptClip 中新增 Prompt 级别的批注功能，用于记录某条 Prompt 的使用观察、效果反馈和截图资料。批注不改变 Prompt 正文，不参与当前版本搜索，仅在 Prompt 详情面板中展示和编辑。

目标用户是使用 PromptClip 管理本地 Prompt 文件的个人用户。成功状态是用户可以在查看某条 Prompt 时，直接新增、编辑、删除纯文本批注，并为批注添加图片附件；删除 Prompt 时，对应批注数据和图片附件也随 Prompt 一起进入 `.trash`。

验收标准：

- Prompt 详情面板中新增“批注”区域。
- 用户可以为当前 Prompt 新增多条批注。
- 每条批注只需要用户输入纯文本内容。
- 每条批注自动记录创建时间和编辑时间。
- 用户可以编辑、删除已有批注。
- 用户可以给每条批注添加一张图片附件。
- 图片附件存储在工作区内，不上传到外部服务。
- 批注数据使用 sidecar JSON 存储，不写入 Prompt `.md` 文件。
- 当前版本批注内容不参与全局搜索、标签筛选或排序。
- 删除 Prompt 时，对应批注 JSON 和附件目录一起移动到 `.trash`。
- 如批注文件或附件操作失败，需要给用户明确错误，不静默吞掉异常。

## Tech Stack

- React 18.3 + TypeScript 5.6
- Zustand 5，用于现有 Prompt 和 UI 状态
- Tailwind CSS 3.4，用于组件样式
- Vitest 2.1，用于服务、store、组件测试
- File System Access API，用于 Web 端工作区文件读写
- Tauri v2 文件系统能力，用于桌面端工作区文件读写

不新增运行时依赖，除非实现图片二进制读写时发现现有浏览器或 Tauri API 无法覆盖基础能力。

## Commands

```bash
npm run dev
npm run test
npm run type-check
npm run lint
npm run build
```

桌面端手动验证时使用：

```bash
npm run tauri:dev
```

## Project Structure

```text
src/types/
  annotation.ts                     # 批注、附件、sidecar 文件结构类型

src/constants/
  config.ts                         # 增加 .promptclip、annotations、assets 路径常量

src/services/
  annotationService.ts              # 批注 CRUD、附件写入、Prompt 删除时清理/移动
  annotationService.test.ts
  fileRepository/
    types.ts                        # 增加二进制文件读写能力
    webFileRepository.ts            # File System Access API 二进制实现
    tauriFileRepository.ts          # Tauri 二进制实现
    fakeFileRepository.ts           # 测试用二进制实现

src/stores/
  annotationStore.ts                # 当前选中 Prompt 的批注状态和动作
  annotationStore.test.ts

src/components/prompt/
  AnnotationPanel.tsx               # 详情面板中的批注区域
  AnnotationItem.tsx                # 单条批注展示、编辑、删除、附件预览
  AnnotationComposer.tsx            # 新增批注输入和图片选择
  index.ts                          # barrel 导出

src/components/layout/
  DetailPanel.tsx                   # 嵌入 AnnotationPanel

src/i18n/
  messages.ts                       # 批注相关简体中文文案
```

数据存储目录：

```text
.promptclip/
  annotations/
    <promptId>.json
  assets/
    <promptId>/
      <annotationId>/
        <attachmentId>.<ext>
.trash/
  <promptTrashBase>.md
  annotations/
    <promptTrashBase>.json
  assets/
    <promptTrashBase>/
```

## Data Model

批注 sidecar JSON 是批注功能的权威数据源。

```ts
export interface PromptAnnotationFile {
  promptId: string;
  version: 1;
  annotations: PromptAnnotation[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptAnnotation {
  id: string;
  text: string;
  attachments: AnnotationAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationAttachment {
  id: string;
  type: 'image';
  name: string;
  mimeType: string;
  path: string;
  size: number;
  createdAt: string;
}
```

存储规则：

- 批注文件路径：`.promptclip/annotations/<promptId>.json`
- 图片附件路径：`.promptclip/assets/<promptId>/<annotationId>/<attachmentId>.<ext>`
- JSON 中的 `path` 使用相对工作区根目录的路径。
- `createdAt` 和 `updatedAt` 使用 ISO 字符串。
- 批注文本必须 trim 后非空。
- 每条批注最多 1 张图片附件。
- 图片附件大小上限为 5MB。
- 图片附件只接受浏览器或系统识别为 `image/*` 的文件。
- 不把图片 base64 写入 JSON 或 Markdown。

## Code Style

遵循项目现有 TypeScript/React 约定：

- 组件使用函数式组件和命名导出。
- Props 接口定义在组件文件内，并 export type。
- 跨模块导入使用 `@/` 路径别名。
- 同模块内部使用相对路径。
- Service 层导出独立函数，并提供 `AnnotationService = { ... } as const`。
- Zustand store 保持当前项目的 `create<State>()((set, get) => ({ ... }))` 风格。
- 用户可见文字使用简体中文，放入现有 i18n 消息结构。
- 不引入后端、数据库、路由或新的 UI 组件库。

示例风格：

```tsx
export interface AnnotationComposerProps {
  isSaving: boolean;
  onSubmit: (text: string, images: File[]) => Promise<void>;
}

export function AnnotationComposer({ isSaving, onSubmit }: AnnotationComposerProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);

  async function handleSubmit() {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    await onSubmit(trimmedText, images);
    setText('');
    setImages([]);
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-24 w-full rounded-md border border-surface bg-bg px-3 py-2 text-sm"
        placeholder="记录这条 Prompt 的使用效果..."
      />
      <button type="button" onClick={handleSubmit} disabled={isSaving}>
        保存批注
      </button>
    </div>
  );
}
```

## Testing Strategy

开发严格遵循 RED/GREEN TDD：

- 先写失败测试，再实现最小代码通过测试。
- 测试行为，不测试内部实现细节。
- 测试文件与源文件同目录，命名为 `*.test.ts` 或 `*.test.tsx`。
- 测试不依赖外部网络、真实随机值或真实用户目录。

建议测试：

- `annotationService.test.ts`
  - 首次读取不存在的批注文件时返回空批注列表。
  - 新增批注会创建 `.promptclip/annotations/<promptId>.json`。
  - 编辑批注只更新目标批注文本和 `updatedAt`。
  - 删除批注会从 JSON 中移除对应记录。
  - 添加图片附件会写入 assets 路径，并在 JSON 中记录相对路径。
  - 同一条批注添加第二张图片时返回明确错误。
  - 图片超过 5MB 时返回明确错误。
  - 删除单条批注时同步删除该批注下的图片附件目录。
  - 删除 Prompt 时，批注 JSON 和附件目录会用同一删除基名移动到 `.trash`。
  - 非图片文件作为附件时返回明确错误。

- `annotationStore.test.ts`
  - 切换选中 Prompt 时加载对应批注。
  - 新增、编辑、删除后状态与 service 返回值一致。
  - service 抛错时保留错误状态，不伪装成功。

- `AnnotationPanel.test.tsx`
  - 无批注时展示空状态。
  - 有批注时按创建时间倒序展示。
  - 可以输入文本并触发新增。
  - 空文本不能保存。
  - 图片附件显示预览或文件名。

- `DetailPanel.test.tsx`
  - 选中 Prompt 时渲染批注区域。
  - 未选中 Prompt 时不触发批注加载。

验证命令：

```bash
npm run test
npm run type-check
npm run lint
npm run build
```

## Boundaries

- Always:
  - 批注存储为 sidecar JSON，不写入 Prompt `.md` 文件。
  - 图片附件存储为工作区内的独立文件，不使用 base64 内联。
  - 每条批注最多允许 1 张图片附件，单张图片最大 5MB。
  - 删除单条批注时同步删除该批注下的附件文件。
  - 当前版本批注不参与搜索、标签筛选或 Prompt 排序。
  - 删除 Prompt 时，批注 JSON 和附件目录必须和 Prompt Markdown 使用同一删除基名进入 `.trash`。
  - 所有文件操作失败都需要暴露明确错误。
  - 保持现有架构依赖方向：types → constants → utils → services → stores → hooks → components。
  - 新增目录后更新对应 barrel 文件。
  - 实现前先写失败测试，实现后运行测试、类型检查、lint 和 build。

- Ask first:
  - 增加运行时依赖。
  - 改变 Prompt Markdown frontmatter 格式。
  - 让批注参与全局搜索、筛选或导出。
  - 支持非图片附件。
  - 增加富文本编辑器、Markdown 编辑器或行内批注定位。
  - 改变现有 `.history` 历史版本语义。

- Never:
  - 不上传批注文本或图片到外部服务。
  - 不引入后端、数据库或云同步。
  - 不把批注内容追加到 Prompt 正文。
  - 不静默吞掉 JSON 解析、附件写入、移动到 `.trash` 的失败。
  - 不跳过或禁用现有测试。
  - 不删除用户已有文件，除非用户明确执行删除 Prompt 或删除批注动作。

## Success Criteria

- 用户在 Prompt 详情面板中可以看到“批注”区域。
- 用户可以输入纯文本并保存为一条新批注。
- 批注自动显示创建时间；编辑后显示更新后的编辑时间。
- 用户可以编辑和删除已有批注。
- 用户可以选择 1 张不超过 5MB 的图片并添加到批注中。
- 图片附件被复制到 `.promptclip/assets/<promptId>/<annotationId>/`。
- 批注 JSON 被写入 `.promptclip/annotations/<promptId>.json`。
- 刷新应用并重新加载工作区后，批注和图片附件仍可显示。
- 当前版本搜索 Prompt 时不会命中批注内容。
- 删除 Prompt 后，对应 `.md`、批注 JSON、附件目录都用同一删除基名移动到 `.trash`。
- `npm run test`、`npm run type-check`、`npm run lint`、`npm run build` 通过。

## Open Questions

- 暂无。已确认：每条批注最多 1 张图片，单张图片最大 5MB；删除单条批注时同步删除附件；删除 Prompt 时批注和附件与 Prompt Markdown 使用同一删除基名进入 `.trash`。
