<h1 align="center">PromptClip</h1>

<p align="center">
  <strong>本地优先的 AI 提示词管理工具</strong><br>
  数据完全存储在本地，无需注册、无需云端、无需数据库
</p>

<p align="center">
  <a href="#环境要求">环境要求</a> •
  <a href="#安装与构建">安装</a> •
  <a href="#使用指南">使用</a> •
  <a href="#开发">开发</a> •
  <a href="#技术架构">架构</a>
</p>

---

## 特性

- **本地存储** — 数据完全存储在用户选择的本地目录中，每个 Prompt 就是一个 `.md` 文件，随时可用其他工具编辑
- **标签系统** — 支持层级标签（如 `coding/python`），标签树可视化，支持重命名、删除、置顶
- **全文搜索** — 基于 FlexSearch 的三索引加权搜索（标题 > 内容 > 标签），毫秒级响应
- **命令面板** — `Cmd+K` 快速访问所有功能，支持模糊匹配和全文搜索回退
- **多格式导出** — 支持 JSON、CSV、Markdown ZIP 三种格式，可选导出范围（选中 / 当前筛选 / 全部）
- **历史版本** — 每次编辑自动保存历史版本（最多 10 个）到 `.history/` 目录
- **安全删除** — 删除的文件移入 `.trash/` 目录（带时间戳），支持手动恢复
- **桌面端** — 基于 Tauri 2 的原生桌面应用，支持系统托盘、单实例运行
- **键盘优先** — 完整的快捷键支持，可脱离鼠标高效操作

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
2. 目录中的 `.md` 文件会被自动识别和加载
3. 每个文件对应一个 Prompt，元数据通过 YAML frontmatter 存储

### 创建 Prompt

- 快捷键 `Cmd+N` / `Ctrl+N`，或点击右上角「新建」按钮
- 如果当前选中了某个标签过滤，新建时会自动带入该标签
- 填写标题、内容、标签后点击「创建」

### 搜索

- 快捷键 `Cmd+F` / `Ctrl+F` 聚焦搜索框
- 支持标题和内容的全文搜索，输入 300ms 防抖后触发
- 在命令面板中无匹配命令时，自动回退到全文搜索

### 筛选与视图

| 视图 | 快捷键 | 说明 |
|------|--------|------|
| 全部 | `Cmd+1` | 按创建时间倒序 |
| 最近 | `Cmd+2` | 按更新时间倒序 |
| 收藏 | `Cmd+3` | 按收藏时间倒序 |

- 点击侧边栏标签可按标签过滤（支持层级匹配）
- 筛选条件可叠加：搜索 + 标签 + 视图

### 导出

- 点击「导出」按钮或通过命令面板触发
- 支持格式：JSON、CSV、Markdown ZIP
- 导出范围：选中的 Prompt、当前筛选结果、全部

### 数据存储格式

每个 Prompt 以 Markdown 文件存储，使用 YAML frontmatter 保存元数据：

```markdown
---
title: "Prompt 标题"
tags: ["coding", "coding/python"]
created: "2025-01-01T00:00:00.000Z"
modified: "2025-01-02T00:00:00.000Z"
copy_count: 5
pinned: false
---

Prompt 内容...
```

应用还会在工作目录中生成以下辅助目录和文件：

| 路径 | 用途 |
|------|------|
| `.history/` | 历史版本，每次编辑自动保存（最多 10 个） |
| `.trash/` | 已删除的文件，文件名带时间戳 |
| `.promptclip.json` | 工作区配置（置顶标签等） |

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` / `Ctrl+K` | 打开命令面板 |
| `Cmd+N` / `Ctrl+N` | 新建 Prompt |
| `Cmd+F` / `Ctrl+F` | 搜索 |
| `Cmd+S` / `Ctrl+S` | 保存 |
| `Cmd+1` | 显示全部 |
| `Cmd+2` | 显示最近 |
| `Cmd+3` | 显示收藏 |
| `Escape` | 关闭面板/模态框 |

## 技术架构

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3.4 |
| 国际化 | 自研 i18n（支持 zh-CN / zh-TW / en-US） |
| 搜索 | FlexSearch 0.7 |
| Markdown | Marked 15 |
| 文件打包 | JSZip |
| 桌面端 | Tauri 2 |
| 测试 | Vitest |

### 项目结构

```
src/
├── types/           # TypeScript 类型定义
├── constants/       # 常量配置（CONFIG, KEYBINDINGS, DEFAULTS）
├── utils/           # 纯函数工具
├── i18n/            # 国际化（zh-CN, zh-TW, en-US）
├── services/        # 业务逻辑层
│   ├── fileRepository/  # 文件系统抽象（Web / Tauri / Fake）
│   ├── promptService.ts # Prompt CRUD
│   ├── searchService.ts # FlexSearch 索引
│   ├── tagService.ts    # 标签树构建
│   └── exportService.ts # 多格式导出
├── stores/          # Zustand 状态管理
│   ├── fileStore.ts     # 工作区状态（persist）
│   ├── promptStore.ts   # Prompt 列表 + 过滤
│   ├── tagStore.ts      # 标签树 + 置顶
│   ├── uiStore.ts       # UI 状态（选中、模态框、Toast）
│   └── settingsStore.ts # 设置（语言、历史版本）（persist）
├── hooks/           # React Hooks
├── components/      # React 组件
│   ├── common/      #   通用 UI 基础组件（Button, SideDrawer, TagPill）
│   ├── layout/      #   布局骨架（Sidebar, TopBar, FilterTabs）
│   ├── prompt/      #   Prompt 领域组件（PromptCard, CreateModal, DetailPanel）
│   ├── tag/         #   标签组件（TagTree, TagSelect）
│   ├── command/     #   命令面板
│   ├── settings/    #   设置界面（SettingsModal）
│   └── export/      #   导出功能（ExportModal）
└── App.tsx          # 根组件
```

依赖方向：`types → constants → utils → services → stores → hooks → components`，禁止反向依赖。

### 核心数据流

1. 用户选择本地目录 → 目录句柄存入 IndexedDB（Web）或 Tauri Store（桌面端）
2. `usePromptLoader` 触发 → `PromptService.loadPrompts` 扫描所有 `.md` 文件
3. 解析 YAML frontmatter → 构建 Prompt 对象数组 → 存入 Zustand store
4. 同时构建 FlexSearch 三索引内存索引（标题 +10、内容 +5、标签 +3）
5. 从所有 Prompt 的 tags 字段动态提取标签树
6. **无文件监听** — 外部修改文件后需刷新页面

### 持久化策略

| Store | 持久化目标 | 用途 |
|-------|-----------|------|
| `fileStore` | localStorage + IndexedDB | 工作区目录句柄 |
| `settingsStore` | localStorage | 界面语言、历史版本配置 |

### 文件系统抽象

通过 `FileRepository` 接口统一 Web 和桌面端的文件操作，运行时自动检测环境选择实现：

| 实现 | 平台 | 技术 |
|------|------|------|
| `webFileRepository` | 浏览器 | File System Access API + IndexedDB |
| `tauriFileRepository` | 桌面端 | Tauri Rust 后端命令 + 原生文件对话框 |
| `fakeFileRepository` | 测试 | 内存模拟 |

### 桌面端特性

基于 Tauri 2 的原生桌面应用，额外提供：

- **系统托盘** — 最小化到托盘，点击恢复窗口
- **单实例运行** — 二次启动时恢复已有窗口
- **原生对话框** — 文件夹选择和保存对话框使用原生 UI
- **安全路径** — Rust 后端验证所有路径在工作区内，防止路径遍历

## 开发

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 运行测试
npm run test

# 测试可视化界面
npm run test:ui
```

## Roadmap

详见 [TODO.md](./TODO.md)：

- [ ] 文件加载并行化
- [ ] FlexSearch 索引持久化到 IndexedDB
- [ ] 文件系统变更监听

## License

[MIT](./LICENSE)
