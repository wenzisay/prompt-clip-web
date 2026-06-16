<h1 align="center">PromptClip</h1>

<p align="center">
  <strong>本地优先的 AI 提示词管理工具</strong><br>
  数据完全存储在本地，无需注册、无需云端、无需数据库
</p>

<p align="center">
  <a href="#特性">特性</a> •
  <a href="#环境要求">环境要求</a> •
  <a href="#安装与构建">安装</a> •
  <a href="#使用指南">使用</a> •
  <a href="#开发">开发</a> •
  <a href="#技术架构">架构</a>
</p>

---

## 特性

- **本地存储** — 数据完全存储在用户选择的本地目录中，每个 Prompt 就是一个 `.md` 文件（YAML frontmatter + Markdown 正文），随时可用其他工具编辑
- **标签系统** — 支持层级标签（如 `coding/python`），标签树可视化，支持重命名、删除、置顶
- **全文搜索** — 基于 FlexSearch 的三索引加权搜索（标题 +10 / 内容 +5 / 标签 +3），毫秒级响应
- **命令面板** — `Cmd+K` 快速访问所有功能，支持模糊匹配；无匹配时自动回退到全文搜索
- **批注系统** — 每条 Prompt 可附带文字批注和图片附件，独立存放在 `_promptclip/annotations/`
- **分享图片** — 渲染 Prompt 为可分享的 PNG 卡片（极简白 / 深色 / 淡彩边框三套模板）
- **多格式导出** — JSON、CSV、Markdown ZIP 三种格式，导出范围可选「选中 / 当前筛选 / 全部」
- **历史版本** — 可选开启；启用后每次编辑自动保存到 `_promptclip/.history/`（默认最多 10 个，按保留天数清理）
- **元数据自愈** — 从 Obsidian 等外部工具导入的 `.md` 可在设置中一键扫描并补全缺失的 PromptClip frontmatter
- **稳定 ID 迁移** — 首次加载会为缺 ID 的旧文件生成稳定 ID 并写回 frontmatter，方便历史/回收/批注系统关联
- **两级加载** — 首屏只读文件头（frontmatter + 预览片段）保证可交互，正文由 `requestIdleCallback` 后台分批补全
- **虚拟化列表** — 5K 级别工作区下用 `@tanstack/react-virtual` 渲染可视行，DOM 节点数与列表总长无关
- **安全删除** — 文件移入 `_promptclip/.trash/`（带时间戳），批注 sidecar 同步迁移
- **桌面端** — 基于 Tauri 2 的原生桌面应用，支持系统托盘、单实例运行、关闭即隐藏
- **多语言** — 内置 `zh-CN` / `zh-TW` / `en-US` 三种语言，启动时按浏览器语言自动选择
- **键盘优先** — 完整快捷键支持，可脱离鼠标高效操作

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 前端构建 |
| npm | 9+ | 包管理 |
| Rust | 1.77.2+ | 仅桌面端构建需要 |
| Tauri CLI | 2.x | 随 `npm install` 安装为 devDependency |

### Web 版浏览器要求

需要支持 [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) 的浏览器：

- Chrome 86+
- Edge 86+
- Opera 72+

> Firefox 和 Safari 目前不支持此 API，建议使用 Chrome 或 Edge。

### 桌面端系统依赖

**macOS**: 无额外依赖，Xcode Command Line Tools 即可（`xcode-select --install`）。

**Windows**:
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) — 安装时勾选「C++ 桌面开发」工作负载
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) — Windows 10/11 已预装

**Linux**:
```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gcc curl wget file libxdo-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 base-devel curl wget file xdotool openssl libappindicator-gtk3 librsvg
```

## 安装与构建

```bash
# 克隆仓库
git clone https://github.com/wenzisay/prompt-clip-web.git
cd prompt-clip-web

# 安装依赖
npm install
```

### Web 版本（浏览器）

```bash
# 启动开发服务器
npm run dev

# 构建生产版本（输出到 dist/）
npm run build

# 预览构建产物
npm run preview
```

### 桌面版本（Tauri）

```bash
# 启动桌面端开发环境
npm run tauri:dev

# 构建桌面端安装包
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物 |
|------|------|
| macOS | `.dmg`、`.app` |
| Windows | `.msi`、`.exe`（NSIS 安装包） |

> Tauri 不支持交叉编译，需要在目标平台上构建。如需在 macOS 上构建 Windows 版本，可使用 GitHub Actions CI。

### CI 多平台构建

项目配置了 GitHub Actions 工作流（`.github/workflows/release.yml`），推送 `v*` tag 时自动触发，为 macOS（aarch64 + x86_64）和 Windows 构建安装包并创建 Draft Release。

## 使用指南

### 首次使用

1. 启动应用后，点击「选择目录」按钮，选择一个本地文件夹作为 Prompt 存储目录
2. 目录中的 `.md` 文件会被自动识别和加载（首屏只解析头部，正文后台补全）
3. 每个文件对应一个 Prompt，元数据通过 YAML frontmatter 存储
4. 应用会写入工作区级配置文件 `_promptclip/promptclip.config.json`，记录置顶标签、历史版本设置、分享作者名等

### 创建与编辑 Prompt

- 快捷键 `Cmd+N` / `Ctrl+N`，或点击右上角「新建」按钮
- 标题、内容、标签均可编辑；标题重命名时同步更新文件名（与目录下其他文件冲突会拒绝）
- 如果当前选中了某个标签过滤，新建时会自动带入该标签

### 搜索

- 顶部搜索框或 `Cmd+K` 打开命令面板后输入关键词
- 标题/标签全文索引首屏即可用；正文索引随后台加载完成自动覆盖全文匹配
- 搜索输入 300ms 防抖后触发

### 筛选与视图

| 视图 | 快捷键 | 说明 |
|------|--------|------|
| 全部 | `Cmd+1` | 按创建时间倒序 |
| 最近 | `Cmd+2` | 按更新时间倒序 |
| 收藏 | `Cmd+3` | 按收藏时间倒序 |

- 点击侧边栏标签可按标签过滤（支持层级匹配，子标签自动命中）
- 筛选条件可叠加：搜索 + 标签 + 视图

### 批注

- 在 Prompt 详情面板中展开「批注」区，可追加文字与图片附件
- 批注按 `promptId` 存为 sidecar JSON，图片存为二进制附件，单张图片上限 5 MB

### 分享图片

- 在 Prompt 详情面板中点击「分享」，可选择极简白 / 深色 / 淡彩边框三种模板
- 可选开关：作者信息、PromptClip 标志、标签、是否渲染 Markdown
- 渲染使用 `html-to-image`，失败时回退到 `html2canvas`；可下载 PNG 或复制到剪贴板
- 作者名在「设置 → 分享作者」配置

### 导出

- 点击「导出」按钮或通过命令面板触发
- 支持格式：JSON、CSV、Markdown ZIP
- 导出范围：选中的 Prompt、当前筛选结果、全部
- 桌面端使用原生保存对话框，Web 端走浏览器下载

### 历史版本（可选）

- 在「设置 → 历史版本」中开启；默认关闭
- 开启后每次编辑 Prompt 自动在 `_promptclip/.history/<id>.<timestamp>.md` 写入快照
- 单条 Prompt 最多保留 `MAX_HISTORY_VERSIONS`（10）份，超过部分按时间淘汰
- 可在 Prompt 详情面板中查看、复制、恢复历史版本

### 元数据自愈

- 在「设置 → 目录维护」点击「扫描元数据」可列出缺字段的 Markdown
- 点击「补全元数据」会把缺失字段写入 frontmatter（已有字段和正文不会被改动）
- 主要用于从 Obsidian 等外部工具批量导入的场景

### 数据存储格式

每个 Prompt 以 Markdown 文件存储，使用 YAML frontmatter 保存元数据：

```markdown
---
id: "p-7y3k9x2a"
title: "Prompt 标题"
tags: ["coding", "coding/python"]
created: "2025-01-01T00:00:00.000Z"
modified: "2025-01-02T00:00:00.000Z"
copy_count: 5
pinned: false
---
```

应用还会在工作目录中生成以下辅助目录和文件：

| 路径 | 用途 |
|------|------|
| `_promptclip/.history/` | 历史版本快照（`.md`），仅在「设置」中开启后写入 |
| `_promptclip/.trash/` | 已删除的文件，文件名带时间戳 |
| `_promptclip/promptclip.config.json` | 工作区配置（置顶标签、历史版本设置、分享作者名） |
| `_promptclip/annotations/<promptId>.json` | Prompt 批注 sidecar 文件 |
| `_promptclip/assets/<promptId>/<annotationId>/...` | 批注附带的图片二进制文件 |

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` / `Ctrl+K` | 打开命令面板 |
| `Cmd+N` / `Ctrl+N` | 新建 Prompt |
| `Cmd+F` / `Ctrl+F` | 搜索（声明在 `KEYBINDINGS`，待接入） |
| `Cmd+S` / `Ctrl+S` | 保存（声明在 `KEYBINDINGS`，待接入） |
| `Cmd+1` | 显示全部 |
| `Cmd+2` | 显示最近修改 |
| `Cmd+3` | 显示收藏 |
| `Escape` | 关闭面板 / 模态框 / 命令面板 |

> `KEYBINDINGS` 常量中预留了 `COPY` / `PASTE` / `DELETE`（Backspace）等条目，可在 `useKeyboardShortcuts.ts` 中按需扩展。

## 技术架构

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript 5.6（strict） |
| 构建 | Vite 6 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3.4（自定义 token：`accent` / `secondary` / `tertiary` / `bg` / `surface` / `surfaceContainer` / `surfaceHigh` / `surfaceDim` / `fg` / `muted`） |
| 国际化 | 自研 i18n，支持 `zh-CN` / `zh-TW` / `en-US`，启动时按浏览器语言自动选择 |
| 搜索 | FlexSearch 0.7（标题 +10 / 内容 +5 / 标签 +3 加权合并） |
| Markdown | Marked 15 |
| 列表虚拟化 | `@tanstack/react-virtual` 3.x |
| 文件打包 | JSZip 3 |
| 分享图渲染 | `html-to-image` + `html2canvas` 回退 |
| 桌面端 | Tauri 2（`tray-icon` / `single-instance` / `persisted-scope` / `store` / `dialog` / `fs`） |
| 测试 | Vitest 2 + jsdom + `@testing-library/react` |

### 项目结构

```
src/
├── types/                  # TypeScript 数据模型（prompt / file / tag / annotation / share / ui）
├── constants/              # 静态配置（CONFIG / KEYBINDINGS / DEFAULTS / shareTemplates）
├── utils/                  # 纯函数（markdown / path / id / date / debounce / storage / errorMessage）
├── i18n/                   # 自研 i18n（messages.ts + useTranslation hook）
├── services/               # 业务逻辑层
│   ├── fileRepository/     # 文件系统抽象：webFileRepository / tauriFileRepository / fakeFileRepository
│   ├── promptService.ts    # Prompt CRUD + 两级加载 + 历史版本
│   ├── promptLazyLoader.ts # 后台分批补全 content
│   ├── searchService.ts    # FlexSearch 三索引
│   ├── tagService.ts       # 标签解析 / 树构建 / 重命名
│   ├── exportService.ts    # JSON / CSV / Markdown ZIP 导出
│   ├── exportTargetService.ts  # 浏览器下载 vs Tauri 原生保存对话框
│   ├── annotationService.ts    # 批注 sidecar 读写
│   ├── shareImageService.ts    # 分享图渲染（html-to-image / html2canvas）
│   ├── folderConfigService.ts  # `_promptclip/promptclip.config.json` 读写
│   └── metadataRepairService.ts# 补全 Obsidian 导入文件的 frontmatter
├── stores/                 # Zustand 状态管理
│   ├── fileStore.ts        # 工作区状态（persist → localStorage）
│   ├── promptStore.ts      # Prompt 列表 / 过滤 / 筛选
│   ├── tagStore.ts         # 标签树 / 置顶（置顶持久化到 _promptclip/promptclip.config.json）
│   ├── uiStore.ts          # UI 状态（选中 / 模态框 / Toast）
│   ├── settingsStore.ts    # 设置（persist → localStorage）
│   └── annotationStore.ts  # 批注状态
├── hooks/                  # React Hooks
│   ├── usePromptLoader.ts       # 两阶段加载
│   ├── usePromptLazyLoad.ts     # 后台分批补全 content
│   ├── useResponsiveColumnCount.ts
│   ├── useDirectoryPicker.ts
│   └── useKeyboardShortcuts.ts
├── components/             # React 组件
│   ├── common/             #   通用 UI（Button / IconButton / Modal / Overlay / SideDrawer / Spinner）
│   ├── layout/             #   布局（Sidebar / TopBar / FilterTabs / DetailPanel）
│   ├── prompt/             #   Prompt 领域（PromptCard / PromptGrid / CreateModal / DeleteConfirm
│   │                       #                / HistoryModal / AnnotationPanel / MarkdownModeToggle
│   │                       #                / MarkdownPreviewEditor / MarkdownTextView
│   │                       #                / PromptMarkdownEditorField / PromptContent）
│   ├── tag/                #   标签（TagPill / TagSelect / TagTree）
│   ├── command/            #   命令面板（CommandPalette）
│   ├── settings/           #   设置（SettingsModal）
│   ├── export/             #   导出（ExportModal）
│   ├── share/              #   分享图（ShareImageModal / ShareCardPreview）
│   └── WelcomeScreen.tsx   #   未授权欢迎页
└── App.tsx                 # 根组件
```

依赖方向：`types → constants → utils → services → stores → hooks → components`，禁止反向依赖。

### 核心数据流

1. 用户选择本地目录 → Web 端把 `FileSystemDirectoryHandle` 存入 IndexedDB（`webFileRepository`），桌面端把目录路径作为 `WorkspaceRef` 传回（`tauriFileRepository`）
2. `usePromptLoader` 触发 → `PromptService.loadPrompts` 阶段 1 并发（concurrency=20）调用 `repository.readTextHead(path, 8192)` 读取每个文件头部
3. 解析 YAML frontmatter（`parseFrontmatterOnly`）→ 截取预览片段（≤ 4 行 / 120 字符）→ 缺 ID 的旧文件生成稳定 ID 并写回
4. `promptStore.setPrompts` → `SearchService.buildSearchIndex({ skipContent: true })` 只索引 `title + tags`，列表立即可见
5. `usePromptLazyLoad` 启动后台 idle 加载，每批 50 条并发 `ensureContent` → `patchPromptContent` → `addContentToIndex`
6. 切换 workspace、组件卸载时 `cancelLazyContentLoad()` 中止后续批次；进行中批次靠 generation 标识丢弃过期结果
7. 从所有 Prompt 的 tags 字段动态构建标签树；筛选 / 搜索 / 视图切换由 `promptStore.applyFilter` 完成
8. **无文件监听** — 外部修改文件后需刷新页面（FileSystemObserver 等方案见 `TODO.md`）

### 持久化策略

| 数据 | 持久化目标 | 写入位置 |
|------|-----------|---------|
| `fileStore.isAuthorized` / `workspaceName` / `lastAccessTime` | localStorage | `promptclip-file-storage` key |
| Web 端 `FileSystemDirectoryHandle` | IndexedDB | `FileRepository` 内部 |
| 桌面端 `WorkspaceRef.path` | 运行时内存 + 单实例窗口 | Tauri 主进程 |
| `settingsStore.locale` | localStorage | `promptclip-settings` key |
| 置顶标签 / 历史版本设置 / 分享作者名 | 工作区文件 | `_promptclip/promptclip.config.json` |
| 标签 / Prompt 数据 | 用户目录 | `.md` 文件 + YAML frontmatter |
| 批注 sidecar | 用户目录 | `_promptclip/annotations/<promptId>.json` |
| 批注图片 | 用户目录 | `_promptclip/assets/<promptId>/<annotationId>/...` |
| 历史快照（可选） | 用户目录 | `_promptclip/.history/<id>.<timestamp>.md` |
| 已删除 | 用户目录 | `_promptclip/.trash/<id>.<timestamp>.md` |

> 切换语言会自动在 `promptclip-settings` 中持久化；切回桌面端时 `fileStore` 仅记住「曾经授权过」，真正的工作区句柄每次启动时通过 `fileRepository.restoreDirectory()` 重新读取。

### 文件系统抽象

通过 `FileRepository` 接口统一 Web 和桌面端的文件操作，运行时自动检测环境选择实现：

| 实现 | 平台 | 技术 |
|------|------|------|
| `webFileRepository` | 浏览器 | File System Access API + IndexedDB（存 directory handle） |
| `tauriFileRepository` | 桌面端 | Tauri Rust 命令 + `tauri-plugin-fs` + `tauri-plugin-dialog` |
| `fakeFileRepository` | 测试 | 内存模拟，由 `createFakeFileRepository` 工厂创建 |

`readTextHead(path, byteLimit)` 是两级加载的核心：Web 端用 `File.slice + text()` 按字节切片，桌面端按需实现。

### 桌面端特性

基于 Tauri 2 的原生桌面应用，Rust 后端位于 `src-tauri/`，提供：

- **系统托盘** — 关闭按钮即隐藏到托盘，左键或双击托盘恢复窗口，托盘菜单含「显示 / 退出」
- **单实例运行** — `tauri-plugin-single-instance` 保证二次启动唤起已有窗口
- **原生对话框** — 文件夹选择与导出保存对话框使用系统 UI
- **安全路径** — Rust 端 `safe_relative_path` 拒绝绝对路径与 `..` 组件，所有 IO 都校验目标在工作区根目录内
- **持久化作用域** — `tauri-plugin-persisted-scope` 记忆授权过的目录路径
- **macOS Reopen** — 点击 Dock 图标时重新显示主窗口

## 开发

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 运行测试（Vitest 2 + jsdom）
npm run test

# 测试可视化界面
npm run test:ui
```

测试与源文件同目录，命名为 `*.test.ts` / `*.test.tsx`，覆盖：服务（`promptService` / `searchService` / `promptLazyLoader` / `annotationService` / `shareImageService` / `exportService` / `fileRepository` / `folderConfigService` / `metadataRepairService`）、store（`promptStore` / `annotationStore` / `settingsStore`）、组件（`PromptCard` / `PromptGrid` / `CreateModal` / `HistoryModal` / `AnnotationPanel` / `MarkdownPreviewEditor` / `MarkdownModeToggle` / `PromptMarkdownEditorField` / `ShareCardPreview` / `SettingsModal` / `CommandPalette` / `TopBar` / `DetailPanel` / `WelcomeScreen`）与工具函数。

## Roadmap

详见 [TODO.md](./TODO.md)：

- [ ] 回收站 UI
- [ ] 归档（从索引移除但保留文件）
- [ ] 文件加载并行化（worker / chunked）
- [ ] FlexSearch 索引持久化到 IndexedDB
- [ ] 多版本 / 分身（如中英双语、Codex 版、Claude 版）
- [ ] 文件监听（`visibilitychange` 刷新 / `lastModified` 轮询 / `FileSystemObserver`）
- [ ] 多设备同步机制（见 `docs/promptclip-sync-design.md`）
- [ ] Web / 桌面端同时打开同一文件夹的锁冲突处理

## License

[MIT](./LICENSE)
