# CLAUDE.md — PromptClip 项目指南

## 项目概述

PromptClip 是一个 AI 提示词管理工具。Web 端为纯前端应用，用户通过浏览器 File System Access API 选择本地目录，应用直接读写 `.md` 文件（YAML frontmatter + Markdown 正文）。桌面端基于 Tauri 2 封装同一套前端。无后端服务、无数据库、无路由。

## 常用命令

```bash
npm run dev          # 启动开发服务器 (localhost:5173)
npm run build        # tsc 类型检查 + Vite 构建
npm run type-check   # 仅类型检查 (tsc --noEmit)
npm run lint         # ESLint 检查 src/
npm run test         # Vitest 测试
npm run test:ui      # Vitest 可视化界面
npm run tauri:dev    # 桌面端开发（需 Rust）
npm run tauri:build  # 构建桌面端安装包
```

## 架构

```
src/
├── types/           # TypeScript 类型定义（数据模型）
├── constants/       # 静态配置（CONFIG, KEYBINDINGS, DEFAULTS, shareTemplates）
├── utils/           # 纯函数工具（无副作用）
├── i18n/            # 自研 i18n（messages.ts + useTranslation hook）
├── services/        # 业务逻辑层（文件IO、搜索、标签、批注、分享图、导出、回收站、历史版本）
│   └── fileRepository/  # 文件系统抽象：web / tauri / fake（测试）
├── stores/          # Zustand 状态管理（fileStore, promptStore, tagStore, uiStore, settingsStore, annotationStore）
├── hooks/           # React Hooks
├── components/      # React 组件
│   ├── common/      #   通用 UI 基础组件
│   ├── layout/      #   布局骨架
│   ├── prompt/      #   Prompt 领域组件
│   ├── tag/         #   标签领域组件
│   ├── command/     #   命令面板
│   ├── export/      #   导出功能
│   ├── share/       #   分享图
│   ├── recycle/     #   回收站
│   ├── settings/    #   设置
│   ├── about/       #   关于页
│   └── privacy/     #   隐私说明页
└── App.tsx          # 根组件，编排布局和 store
```

依赖方向：types → constants → utils → services → stores → hooks → components，**禁止反向依赖**。

## 代码约定

### 命名

| 类别 | 格式 | 示例 |
|------|------|------|
| 组件文件 | `PascalCase.tsx` | `PromptCard.tsx` |
| 服务文件 | `camelCase.ts` | `fileService.ts` |
| Store 文件 | `camelCase.ts` | `promptStore.ts` |
| Hook 文件 | `useCamelCase.ts` | `usePromptLoader.ts` |
| 工具文件 | `camelCase.ts` | `markdown.ts` |
| 类型文件 | `camelCase.ts` | `prompt.ts` |

### 导入

- 跨模块引用使用 `@/` 路径别名：`import { Button } from '@/components/common/Button'`
- 同模块内部使用相对路径：`import { FileService } from './fileService'`

### 组件

- 函数式组件 + 命名导出（仅 `App.tsx` 使用 default export）
- Props 接口定义在组件文件内，单独 export type
- 状态共享通过 Zustand hooks，不使用 React Context
- 组件直接从 store 读取状态，仅传递领域数据（如 `prompt` 对象）作为 props

### Service 层

每个服务是一个无状态模块，导出独立函数 + 一个 `as const` 冻结对象：

```typescript
export async function loadPrompts(...) { ... }
export const PromptService = { loadPrompts, ... } as const;
```

### Store 层

Zustand v5，每个 store 遵循统一模式：

```typescript
interface XxxState {
  // 数据
  items: Item[];
  // UI 状态
  isLoading: boolean;
  error: string | null;
  // Actions
  setItems: (items: Item[]) => void;
  setError: (error: string | null) => void;
}
export const useXxxStore = create<XxxState>()((set, get) => ({ ... }));
```

`fileStore` 和 `settingsStore` 使用 `persist` 中间件（localStorage + IndexedDB）。

### 样式

- Tailwind CSS 3.4，纯 utility class，不使用 CSS Modules 或 CSS-in-JS
- 自定义主题 token 定义在 `tailwind.config.js`（颜色: `accent`, `secondary`, `tertiary`, `surface`, `fg`, `muted` 等）
- 图标使用 Material Symbols Outlined（字体文件已内置在 `public/fonts/`）

### Barrel 文件

每个目录都有 `index.ts` 做 re-export。新增模块时记得更新对应的 barrel 文件。

## TypeScript

- strict 模式开启，启用了 `noUnusedLocals`、`noUnusedParameters`
- 目标 ES2020，模块解析使用 bundler 模式
- File System Access API 类型声明在 `src/vite-env.d.ts`

## 测试

- 使用 Vitest 2 + jsdom + `@testing-library/react`
- 测试文件与源文件同目录，命名为 `*.test.ts` 或 `*.test.tsx`
- 已覆盖：services（`promptService` / `searchService` / `promptLazyLoader` / `annotationService` / `shareImageService` / `exportService` / `fileRepository` / `folderConfigService` / `metadataRepairService` / `recycleService`）、stores（`promptStore` / `annotationStore` / `settingsStore`）、组件与工具函数
- 运行：`npm run test`，可视化界面 `npm run test:ui`

## UI 语言与国际化

应用支持多语言界面，通过 i18n 模块实现：

### 支持的语言

- `zh-CN` — 简体中文
- `zh-TW` — 繁体中文
- `en-US` — English
- `ja-JP` — 日本語

启动时按浏览器语言自动探测（`detectInitialLocale`），fallback 为 `en-US`；可在「设置」中手动切换。

### 使用方式

```typescript
import { useTranslation } from '@/i18n/useTranslation';

function Component() {
  const { t } = useTranslation();
  return <div>{t.app.title}</div>;
}
```

### 新增翻译

所有用户可见文字必须通过 i18n 添加翻译，在 `src/i18n/messages.ts` 中为四种语言（`zh-CN` / `zh-TW` / `en-US` / `ja-JP`）分别添加对应条目。

### 翻译类型

- 静态字符串：直接使用字符串值
- 动态字符串：使用函数，如 `searchResultCount: (count: number) => \`找到 ${count} 个结果\``

## 核心数据流

1. 用户选择本地目录 → `FileSystemDirectoryHandle` 存入 IndexedDB
2. `usePromptLoader` 触发 → `PromptService.loadPrompts` 扫描所有 `.md` 文件
3. 解析 YAML frontmatter → 构建 Prompt 对象数组 → 存入 Zustand store
4. 同时构建 FlexSearch 内存索引（标题 + 内容 + 标签三个加权索引）
5. 从所有 Prompt 的 tags 字段动态提取标签树
6. **无文件监听**——手动在文件夹中增删文件需刷新页面才能生效
