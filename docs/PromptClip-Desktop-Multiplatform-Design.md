# PromptClip 桌面版多端设计文档

> Implementation status: file repository abstraction and Tauri desktop support implemented according to `docs/superpowers/plans/2026-05-17-desktop-multiplatform.md`.

> 基于《桌面版多端实现方案.md》整理，用于指导下一步 Web、macOS、Windows 多端开发。

## 1. 背景

PromptClip 当前是纯前端 Web 应用，通过浏览器 File System Access API 直接读写用户选择目录中的 Markdown 文件。现有实现满足 Web 场景，但文件访问能力已经进入业务模型、服务层、store 和部分组件，导致桌面端无法直接复用核心逻辑。

下一阶段目标是将 PromptClip 演进为“一套 React/Vite 前端，同时构建 Web、macOS、Windows 桌面应用”。推荐技术路线为 **Tauri 2 + 共享 React/Vite 前端 + 平台文件仓储适配层**。

本次设计不是重写项目，而是以文件访问抽象为核心的架构改造。

## 2. 目标

### 2.1 产品目标

- Web 版继续支持 Chrome、Edge 等支持 File System Access API 的 Chromium 浏览器。
- 桌面版支持 macOS 和 Windows 的本地目录选择、Markdown 读写、历史版本、回收站和配置文件。
- 用户数据仍以本地 Markdown 文件为唯一真实数据源，不引入后端服务。
- Web 与桌面端共享 UI、状态管理、Markdown 解析、搜索、标签等应用层逻辑。

### 2.2 工程目标

- 从业务实体和业务服务中移除浏览器专属的 `FileSystemDirectoryHandle` / `FileSystemFileHandle`。
- 新增平台无关的文件仓储接口，Web 与 Tauri 桌面端各自实现 adapter。
- 将“当前目录句柄状态”升级为“当前工作区状态”。
- 将目录选择、权限恢复、文件读写、目录创建、文件移动等平台差异限制在 adapter 层。
- 保持现有 Web 功能不回退，再逐步接入 Tauri。

## 3. 非目标

- 不在首个多端版本中引入后端、数据库或账号体系。
- 不在首个多端版本中引入 SQLite 索引缓存。
- 不在首个多端版本中实现文件系统监听。
- 不在首个多端版本中实现代码签名、自动更新、系统托盘、全局快捷键。
- 不将 Web 版扩展到 Safari、Firefox 作为可靠目标。

## 4. 当前耦合点

| 模块 | 当前耦合 | 改造方向 |
| --- | --- | --- |
| `src/types/prompt.ts` | `Prompt.fileHandle?: FileSystemFileHandle` | 改为 `filePath: string` |
| `src/types/file.ts` | `DirectoryInfo.handle: FileSystemDirectoryHandle` | 改为平台无关 `WorkspaceRef` / `FileEntry` |
| `src/services/fileService.ts` | 直接封装 File System Access API | 下沉为 `webFileRepository` |
| `src/services/promptService.ts` | CRUD 参数依赖 `FileSystemDirectoryHandle`，读取依赖 `FileSystemFileHandle` | 改为依赖 `FileRepository` + `WorkspaceRef` + 相对路径 |
| `src/services/folderConfigService.ts` | `.promptclip.json` 读写依赖目录句柄 | 改为通过 `FileRepository` 读写 |
| `src/stores/fileStore.ts` | IndexedDB 保存目录句柄，store 暴露 `directoryHandle` | 改为 `workspace: WorkspaceRef | null` |
| `src/stores/tagStore.ts` | pinned tag 持久化传入 `directoryHandle` | 改为传入 `workspace` 或由 service 获取当前 workspace |
| `src/hooks/useDirectoryPicker.ts` | 直接调用 `FileService.openDirectory()` | 改为调用平台 repository |
| `src/hooks/usePromptLoader.ts` | 从 store 读取 `directoryHandle` | 改为读取 `workspace` |
| 组件层 | 多处从 store 读取 `directoryHandle` 后传给 service | 改为读取 `workspace`，或通过 hook 封装工作区操作 |

## 5. 目标架构

### 5.1 分层

```text
React Components
  ↓
Hooks
  ↓
Zustand Stores
  ↓
Domain Services
  ↓
FileRepository Interface
  ↓
webFileRepository / tauriFileRepository
  ↓
Browser FSAA / Tauri APIs
```

依赖方向保持项目现有约定：`types → constants → utils → services → stores → hooks → components`。平台 API 只能出现在 adapter 实现中，不能出现在 domain service、store 或组件的类型签名里。

### 5.2 平台选择

运行时通过 adapter 工厂选择文件仓储实现：

- Web 构建：使用 `webFileRepository`。
- Tauri 桌面构建：使用 `tauriFileRepository`。

平台判断应集中在一个小模块中，例如 `src/services/fileRepository/index.ts`，避免业务代码到处判断 `window.__TAURI__` 或浏览器能力。

## 6. 核心类型设计

新增或调整 `src/types/file.ts`：

```ts
export type PlatformKind = 'web' | 'desktop';

export interface WorkspaceRef {
  id: string;
  name: string;
  platform: PlatformKind;
  path?: string;
  handleKey?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
}

export interface FileRepository {
  isSupported(): boolean;
  selectDirectory(): Promise<WorkspaceRef | null>;
  restoreDirectory(): Promise<WorkspaceRef | null>;
  verifyPermission(workspace: WorkspaceRef): Promise<boolean>;
  clearSavedWorkspace(): Promise<void>;

  listFiles(workspace: WorkspaceRef, extensions: string[]): Promise<FileEntry[]>;
  readText(workspace: WorkspaceRef, path: string): Promise<string>;
  writeText(workspace: WorkspaceRef, path: string, content: string): Promise<FileEntry>;
  exists(workspace: WorkspaceRef, path: string): Promise<boolean>;
  move(workspace: WorkspaceRef, from: string, to: string): Promise<void>;
  mkdir(workspace: WorkspaceRef, path: string): Promise<void>;
  remove(workspace: WorkspaceRef, path: string): Promise<void>;
}
```

`WorkspaceRef.handleKey` 用于 Web adapter 内部恢复 IndexedDB 中的目录句柄。业务层不直接读取它。桌面端使用 `path` 保存真实目录路径。

调整 `src/types/prompt.ts`：

```ts
export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  copyCount: number;
  pinned: boolean;
  filePath: string;
}
```

`filePath` 必须是相对工作区根目录的 POSIX 风格路径，例如 `my-prompt.md`、`folder/my-prompt.md`、`.history/my-prompt.20260517-120000.md`。内部统一使用 `/`，adapter 负责转换为平台原生路径。

## 7. 文件仓储接口约定

### 7.1 路径规则

- 业务层只传递相对路径。
- 相对路径不允许为空、不允许以 `/` 开头、不允许包含 `..` 路径段。
- 业务层统一使用 `/` 作为分隔符。
- Windows 保留文件名、非法字符、路径大小写差异由路径工具函数集中处理。

建议新增 `src/utils/path.ts`：

- `normalizeRelativePath(path: string): string`
- `joinPath(...parts: string[]): string`
- `assertSafeRelativePath(path: string): void`
- `toPortablePath(path: string): string`
- `sanitizeFilename(name: string): string`

### 7.2 隐藏目录规则

`listFiles()` 默认递归扫描工作区内文件，但跳过隐藏目录，尤其是：

- `.history/`
- `.trash/`
- 其他以 `.` 开头的目录

历史版本和回收站由 `PromptService` 显式读写，不参与主列表加载。

### 7.3 错误语义

adapter 可以保留平台底层错误，但对业务层应优先抛出稳定错误：

| 场景 | 建议错误信息 |
| --- | --- |
| 平台不支持文件访问 | `当前环境不支持选择本地目录` |
| 权限过期或被拒绝 | `目录访问权限已过期，请重新选择数据目录` |
| 文件不存在 | `文件不存在或已被移动` |
| 路径不安全 | `文件路径不合法` |
| 标题冲突 | `标题已存在，请使用不同的标题` |
| 写入失败 | `写入文件失败，请检查目录权限` |

## 8. Web Adapter 设计

`webFileRepository` 负责封装现有 File System Access API。

### 8.1 目录选择

- `isSupported()` 检查 `showDirectoryPicker` 和 `indexedDB`。
- `selectDirectory()` 调用 `window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' })`。
- 用户取消时返回 `null`。
- 授权成功后保存目录句柄到 IndexedDB，返回 `WorkspaceRef`。

### 8.2 工作区恢复

- IndexedDB 继续使用当前语义保存 `FileSystemDirectoryHandle`。
- localStorage 可保存 `WorkspaceRef` 的可序列化部分。
- `restoreDirectory()` 从 IndexedDB 读取目录句柄，调用 `queryPermission({ mode: 'readwrite' })`。
- 权限为 `granted` 时返回 Web 工作区；权限过期时返回 `null`，并由 store 设置错误信息。

### 8.3 文件操作

- `listFiles()` 从目录句柄递归扫描，返回 `FileEntry[]`。
- `readText()` 通过相对路径解析到 `FileSystemFileHandle` 后读取文本。
- `writeText()` 创建中间目录并写入。
- `move()` 使用复制加删除实现，兼容不支持直接重命名的浏览器。
- `mkdir()` 使用 `getDirectoryHandle(name, { create: true })`。
- `remove()` 使用 `removeEntry(name)`。

## 9. Desktop Adapter 设计

`tauriFileRepository` 负责封装 Tauri 2 能力。

### 9.1 Tauri 依赖

建议使用 Tauri 2 官方插件：

- `@tauri-apps/plugin-dialog`：选择目录。
- `@tauri-apps/plugin-fs`：读写文件、创建目录、移动文件。
- `@tauri-apps/plugin-store`：保存最近工作区路径。
- `@tauri-apps/api/path`：路径处理辅助。

如果 JS 侧递归扫描和权限 scope 配置不足以覆盖需求，可增加 Rust command 专门处理递归扫描与路径安全校验。

### 9.2 目录选择

- `selectDirectory()` 调用系统目录选择器。
- 用户取消时返回 `null`。
- 选择成功后返回：

```ts
{
  id: "desktop:/absolute/path",
  name: "Prompts",
  platform: "desktop",
  path: "/absolute/path"
}
```

Windows 下 `path` 可为 `C:\Users\...\Prompts`，但业务层不得拼接它；adapter 内部负责路径转换。

### 9.3 权限与 scope

Tauri 不应默认授予全盘读写。权限 scope 应限制在用户选择的工作区目录内。

实现要求：

- 只读写当前 `WorkspaceRef.path` 下的文件。
- 对所有传入相对路径执行安全校验。
- 禁止 `..` 跳出工作区。
- 禁止写入工作区外路径。

### 9.4 工作区恢复

- 使用 Tauri store 保存最近工作区路径和名称。
- 启动时 `restoreDirectory()` 检查路径是否存在且可读写。
- 路径不存在或不可访问时返回 `null`，store 设置错误信息。

## 10. 服务层改造

### 10.1 PromptService

`PromptService` 不再依赖 `FileSystemDirectoryHandle` 或 `FileSystemFileHandle`。

建议签名：

```ts
export async function loadPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<Prompt>;

export async function loadPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<Prompt[]>;

export async function createPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  input: CreatePromptInput
): Promise<Prompt>;

export async function updatePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt,
  updates: UpdatePromptInput,
  options?: { createHistory?: boolean }
): Promise<Prompt>;

export async function deletePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void>;
```

核心行为保持不变：

- 创建时根据标题生成文件名。
- 更新时可创建 `.history/` 历史版本。
- 删除时移动到 `.trash/`。
- `copyCount` 和 `pinned` 更新不创建历史版本。
- 加载后按 `updatedAt` 倒序排序。

### 10.2 FolderConfigService

`.promptclip.json` 继续作为目录级配置文件，但读写改为 repository：

```ts
readFolderConfig(repository, workspace)
writeFolderConfig(repository, workspace, config)
folderConfigExists(repository, workspace)
updatePinnedTags(repository, workspace, pinnedTags)
```

### 10.3 ExportService

当前导出依赖浏览器 `Blob` + `download`。多端支持时需拆分：

- Web：保留 `Blob` 下载。
- 桌面：优先使用 Tauri dialog 选择导出路径，再写入 ZIP 文件。

导出不阻塞第一阶段文件访问抽象，但在桌面版可用前必须实现桌面下载/保存 adapter。

### 10.4 Clipboard

当前组件直接调用 `navigator.clipboard.writeText()`。Tauri WebView 通常可用，但桌面端应在兼容性验证后决定是否抽象。

首个多端版本可以先保留现状；如 macOS / Windows 验证失败，再新增 `clipboardService` adapter。

## 11. Store 与 Hook 改造

### 11.1 fileStore 改为 workspaceStore 语义

可保留文件名 `fileStore.ts`，但状态语义调整：

```ts
interface FileState {
  isSupported: boolean;
  isAuthorized: boolean;
  workspace: WorkspaceRef | null;
  workspaceName: string | null;
  lastAccessTime: Date | null;
  isLoading: boolean;
  error: string | null;

  setWorkspace: (workspace: WorkspaceRef | null) => void;
  clearWorkspace: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
}
```

`initialize()` 调用当前 repository：

1. 设置 `isSupported`。
2. 调用 `restoreDirectory()`。
3. 对恢复出的 workspace 调用 `verifyPermission()`。
4. 成功则设置授权状态；失败则清空 workspace 并给出中文错误信息。

### 11.2 useDirectoryPicker

继续作为 UI 侧入口，但返回类型改为：

```ts
openDirectory: () => Promise<WorkspaceRef | null>;
```

hook 内部调用当前 repository 的 `selectDirectory()` 和 `verifyPermission()`。

### 11.3 usePromptLoader

从 `useFileStore()` 读取 `workspace`，不再读取 `directoryHandle`。

加载流程：

1. 未授权或无 workspace 时直接返回。
2. 调用 `loadPinnedTags(repository, workspace)`。
3. 调用 `PromptService.loadPrompts(repository, workspace)`。
4. 更新 prompt store、搜索索引和标签 store。

### 11.4 组件层

组件不再知道目录句柄。短期可以继续从 store 读取 `workspace` 后传给 service；更推荐逐步封装领域 hook，例如：

- `usePromptActions()`
- `useTagActions()`
- `useWorkspace()`

这样后续桌面端能力变化不会继续扩散到组件。

## 12. Tauri 项目结构

接入 Tauri 2 后建议新增：

```text
src-tauri/
  Cargo.toml
  tauri.conf.json
  capabilities/
    default.json
  src/
    main.rs
    lib.rs
```

`package.json` 新增脚本：

```json
{
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

前端源码继续位于 `src/`。不要为桌面端复制一套 React 入口。

## 13. 数据兼容性

现有 Markdown 文件格式不变：

```markdown
---
title: "Prompt 标题"
tags: ["tag1", "tag2"]
created: "2025-01-01T00:00:00.000Z"
modified: "2025-01-02T00:00:00.000Z"
copy_count: 5
pinned: false
---

Prompt 内容...
```

目录级辅助文件保持：

- `.promptclip.json`
- `.history/`
- `.trash/`

迁移后 Web 版和桌面版应能打开同一个 PromptClip 数据目录，并读写同一套 Markdown 文件。

## 14. 实施阶段

### 阶段一：文件访问抽象

目标：不引入 Tauri，先从业务层剥离 Web API。

交付物：

- 新增 `WorkspaceRef`、`FileEntry`、`FileRepository`。
- `Prompt.fileHandle` 替换为 `Prompt.filePath`。
- `PromptService` 改为依赖 repository + workspace。
- `FolderConfigService` 改为依赖 repository + workspace。
- `fileStore` 暴露 `workspace` 而非 `directoryHandle`。
- Web 功能保持可用。

验收：

- `npm run type-check` 通过。
- `npm run lint` 通过。
- `npm run build` 通过。
- Web 端能选择目录、加载、新建、编辑、删除、收藏、复制计数、保存置顶标签。

### 阶段二：Web Adapter 固化

目标：将原 `fileService.ts` 整理为 `webFileRepository`。

交付物：

- `src/services/fileRepository/types.ts`
- `src/services/fileRepository/webFileRepository.ts`
- `src/services/fileRepository/index.ts`
- IndexedDB 和 localStorage 恢复逻辑只存在于 Web adapter 或 file store 的 Web 分支中。

验收：

- Web 行为与改造前一致。
- 业务层和组件层不再引用 `FileSystemDirectoryHandle` / `FileSystemFileHandle`。

### 阶段三：Tauri scaffold

目标：让项目具备桌面开发和构建入口。

交付物：

- `src-tauri/` 项目骨架。
- Tauri 2 依赖与插件。
- `tauri:dev`、`tauri:build` 脚本。
- macOS / Windows 基础应用 metadata。
- 基础文件系统权限 scope。

验收：

- macOS 可运行 `npm run tauri:dev`。
- Web 构建不受影响。
- Tauri 窗口可加载现有 React 应用。

### 阶段四：Desktop Adapter

目标：实现桌面端真实路径文件读写。

交付物：

- `src/services/fileRepository/tauriFileRepository.ts`
- Tauri store 保存最近工作区。
- 桌面目录选择、恢复、扫描、读、写、移动、删除。
- 必要时新增 Rust command 处理递归扫描。

验收：

- macOS 桌面端完成核心 CRUD。
- Windows 桌面端完成核心 CRUD。
- `.promptclip.json`、`.history/`、`.trash/` 行为正确。

### 阶段五：构建与回归验证

目标：三端可构建，核心流程稳定。

验证命令：

```bash
npm run type-check
npm run lint
npm run test
npm run build
npm run tauri:build
```

验证场景：

- 首次选择目录。
- 启动后恢复上次目录。
- 加载多个 Markdown prompts。
- 新建 Prompt。
- 编辑标题、正文、标签。
- 标题变更后旧文件被删除，新文件保留。
- 删除 Prompt 后进入 `.trash/`。
- 编辑 Prompt 后写入 `.history/` 并清理超过上限的历史版本。
- 收藏与复制计数不创建历史版本。
- 标签置顶写入 `.promptclip.json`。
- Web 与桌面打开同一目录后数据一致。

## 15. 测试策略

### 15.1 单元测试

优先补测试的模块：

- `utils/path.ts`
- `utils/id.ts` 的跨平台文件名规则。
- `services/promptService.ts`，使用内存版 fake repository。
- `services/folderConfigService.ts`，使用内存版 fake repository。

fake repository 应覆盖：

- 文件存在与不存在。
- 读写内容。
- 移动文件。
- 创建目录。
- 文件修改时间。
- 路径非法时抛错。

### 15.2 集成测试

Web 端：

- 浏览器目录选择流程主要依赖人工验收。
- service 层通过 fake repository 覆盖大部分行为。

桌面端：

- macOS、Windows 至少各执行一次手工回归。
- 重点验证路径分隔符、权限 scope、中文文件名、空格路径。

### 15.3 回归风险测试

每次阶段完成都必须验证：

- 已有 Markdown 文件可加载。
- 创建和编辑不会破坏 frontmatter。
- 标签树、搜索索引、收藏筛选仍能同步更新。
- 用户取消目录选择不会留下错误授权状态。

## 16. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 业务层继续泄漏平台类型 | 桌面端改造反复返工 | 将 `FileSystem*` 类型限制在 Web adapter 与 `vite-env.d.ts` |
| Web 权限恢复失败 | 用户需要重新选择目录 | 保留当前错误提示，允许快速重新选择 |
| Windows 路径规则差异 | 文件创建、重命名失败 | 集中实现路径工具，使用 fake repository 和 Windows 手工验证 |
| Tauri 文件 scope 配置过宽 | 安全风险 | scope 限制到用户选择目录，所有相对路径强校验 |
| 导出下载依赖浏览器 DOM | 桌面端导出不可用 | 导出服务拆分 Web 下载和桌面保存 |
| 文件监听提前引入 | 增加复杂度和边界问题 | 首个多端版本不实现 watcher |

## 17. 验收标准

首个多端可用版本满足以下标准：

- Web、macOS、Windows 使用同一套 `src/` 应用层代码。
- Web 端现有核心功能无回退。
- macOS、Windows 桌面端可以选择本地目录并完成 Prompt CRUD。
- `Prompt` 类型不包含浏览器文件句柄。
- `PromptService`、`FolderConfigService`、store、hook、组件的公共签名不包含 `FileSystemDirectoryHandle` 或 `FileSystemFileHandle`。
- 平台差异集中在 `FileRepository` adapter。
- 三端能读写同一套 Markdown 数据目录。
- `npm run type-check`、`npm run lint`、`npm run build` 通过。

## 18. 建议开发顺序

1. 新增文件仓储类型和内存 fake repository 测试基础。
2. 将 `Prompt.fileHandle` 改为 `Prompt.filePath`。
3. 改造 `PromptService` 使用 repository。
4. 改造 `FolderConfigService` 使用 repository。
5. 将现有 `fileService.ts` 拆为 `webFileRepository`。
6. 改造 `fileStore`、`useDirectoryPicker`、`usePromptLoader` 和组件调用点。
7. 完成 Web 回归。
8. 初始化 Tauri 2。
9. 实现 `tauriFileRepository`。
10. 完成 macOS / Windows 构建验证。

## 19. 后续扩展

多端基础稳定后再评估：

- 文件系统 watcher。
- FlexSearch 索引持久化。
- 系统托盘。
- 全局快捷键。
- 自动更新。
- 代码签名与发布流水线。
- SQLite 或本地索引缓存。
