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

## 文件格式

Prompt 文件采用 Markdown 格式，支持 Front Matter 元数据：

```markdown
---
title: "Prompt 标题"
tags: ["tag1", "tag2"]
favorite: true
created: 2024-01-01
---

# Prompt 内容

这里写你的提示词内容...
```

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
