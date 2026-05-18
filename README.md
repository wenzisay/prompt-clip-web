# Prompt Clip

> AI 提示词夹 —— 个人 Prompt 管理工具

一个现代化的本地 Prompt 管理应用，帮助你高效组织、搜索和复用 AI 提示词。

## 特性

- **本地存储** — 基于 File System Access API，数据完全存储在本地，无需云端
- **标签系统** — 灵活的标签分类，支持标签树和多选过滤
- **全文搜索** — 使用 FlexSearch 实现毫秒级全文检索
- **Markdown 支持** — 完整的 Markdown 语法支持，实时预览
- **键盘快捷键** — 丰富的快捷键支持，提升操作效率
- **历史版本** — 自动保存历史版本，支持版本回溯
- **批量导出** — 一键导出为 ZIP 压缩包
- **暗色主题** — 护眼的暗色界面设计

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **搜索**: FlexSearch
- **Markdown**: Marked
- **文件处理**: File System Access API + JSZip

## 安装

```bash
# 克隆仓库
git clone https://github.com/wenzisay/prompt-clip-web.git

# 进入目录
cd prompt-clip-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动桌面端开发环境
npm run tauri:dev

# 构建桌面端安装包
npm run tauri:build
```

## 使用方法

### 首次使用

1. 启动应用后，选择一个本地文件夹作为 Prompt 存储目录
2. 在该文件夹中创建 `.md` 文件，应用会自动识别并加载

### 创建 Prompt

- 快捷键: `Cmd+N` / `Ctrl+N`
- 点击右上角的「新建」按钮

### 搜索 Prompt

- 快捷键: `Cmd+F` / `Ctrl+F`
- 支持标题和内容的全文搜索

### 命令面板

- 快捷键: `Cmd+K` / `Ctrl+K`
- 快速访问所有常用功能

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+K` / `Ctrl+K` | 打开命令面板 |
| `Cmd+N` / `Ctrl+N` | 新建 Prompt |
| `Cmd+S` / `Ctrl+S` | 保存 |
| `Cmd+F` / `Ctrl+F` | 搜索 |
| `Cmd+1` | 显示全部 |
| `Cmd+2` | 显示最近 |
| `Cmd+3` | 显示收藏 |
| `Escape` | 关闭面板/模态框 |

## 数据存储

桌面版使用 Tauri 2 访问用户选择的本地目录。Web 版仍使用 File System Access API，推荐 Chrome 或 Edge。

### Prompt 数据

每个 Prompt 以 Markdown 文件存储在本地目录，通过 File System Access API 读写。文件使用 YAML frontmatter 保存元数据：

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

### 辅助持久化

应用状态通过浏览器本地存储持久化：

| 存储 | 用途 | 生命周期 |
|------|------|----------|
| IndexedDB (`promptclip-file-handles`) | 存储目录句柄 `FileSystemDirectoryHandle`，避免每次重新选目录 | 跨会话 |
| localStorage (`promptclip-file-storage`) | 授权状态、目录名、最后访问时间 | 跨会话 |
| localStorage (`promptclip_pinned_tags`) | 置顶标签列表 | 跨会话 |

### 搜索机制

使用 FlexSearch（v0.7.43）构建内存索引，维护三个独立索引并加权合并：

| 索引 | 范围 | 权重 |
|------|------|------|
| `titleIndex` | 标题 | +10 |
| `contentIndex` | 正文内容 | +5 |
| `tagsIndex` | 标签文本 | +3 |

- 索引配置：`tokenize: 'full'`, `resolution: 9`, `optimize: true`, `cache: true`
- 搜索输入 300ms 防抖后触发
- 命令面板无匹配时提供全文搜索回退
- **索引仅存于内存**，每次打开应用全量重建（Prompt 加载后触发 `buildSearchIndex`）

### 标签系统

标签不从属于独立存储，而是每次 Prompt 列表变化时从所有 Prompt 的 `tags` 字段动态提取并构建标签树。

- 使用 `/` 作为层级分隔符（如 `computing/linux`），支持层级匹配
- 标签颜色由标签名 hash 确定性分配
- 置顶标签持久化到 localStorage
- 标签的增删改直接操作对应 Prompt 文件并写回磁盘

### 数据更新流程

| 操作 | 行为 |
|------|------|
| 创建 | 写 `.md` 文件，校验标题唯一性 |
| 更新 | 先在 `.history/` 存历史版本（最多 10 个），再写入文件；标题变更时删除旧文件 |
| 删除 | 软删除 → 移入 `.trash/` 目录，文件名加时间戳 |
| 复制计数 / 置顶 | 跳过历史版本创建（`createHistory: false`） |

更新后状态同步链路：写文件 → Zustand store 更新 → FlexSearch 重建索引 → 过滤器重算 → 标签重提取

### 性能注意事项

当前文件加载为串行读取（`for...await` 逐个处理），文件数量较多时可能影响启动速度。可能的优化方向：

- **并行读取** — 分批并发替代串行 IO
- **延迟加载** — 先只加载 frontmatter，内容按需读取
- **索引持久化** — 利用 FlexSearch 内置 `export`/`import` API 将索引序列化到 IndexedDB，配合文件 `lastModified` 快照做增量更新，跳过全量构建

## 浏览器兼容性

需要支持 File System Access API 的浏览器：

- Chrome 86+
- Edge 86+
- Opera 72+

## 开发

```bash
# 类型检查
npm run type-check

# 代码检查
npm run lint

# 运行测试
npm run test
```

## 项目结构

```
src/
├── components/      # React 组件
│   ├── common/      # 通用组件
│   ├── layout/      # 布局组件
│   ├── prompt/      # Prompt 相关组件
│   ├── tag/         # 标签组件
│   └── command/     # 命令面板组件
├── services/        # 业务逻辑服务
├── stores/          # Zustand 状态管理
├── hooks/           # 自定义 Hooks
├── utils/           # 工具函数
├── constants/       # 常量配置
└── types/           # TypeScript 类型定义
```

## License

MIT
