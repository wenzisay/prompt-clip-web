# PromptClip Web 任务清单

## 阶段 1: 基础与配置

### 任务 1.1: 初始化 Vite + React + TypeScript 项目
**优先级**: P0 | **依赖**: 无 | **阻塞**: 所有任务

**描述**:
使用 Vite、React 18、TypeScript 创建基础项目，并配置构建工具。

**验收标准**:
- [ ] `npm run dev` 在 5173 端口正常运行无报错
- [ ] `npm run build` 生成生产构建
- [ ] `npm run type-check` 类型检查通过
- [ ] package.json 包含规格中的所有依赖
- [ ] ESLint 配置 React 规则

**验证步骤**:
```bash
npm run dev    # 应显示 "Vite ready in XXX ms"
npm run build  # 应创建 dist/ 文件夹
npm run type-check  # 应退出码为 0
```

**需要创建的文件**:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `index.html`
- `.eslintrc.cjs`
- `.gitignore`

---

### 任务 1.2: 配置 Tailwind CSS 和设计令牌
**优先级**: P0 | **依赖**: 1.1 | **阻塞**: 所有 UI 组件

**描述**:
设置 Tailwind CSS 并从原型设计中提取 CSS 变量。

**验收标准**:
- [ ] Tailwind CSS 类名在组件中生效
- [ ] 所有原型中的 CSS 变量在 `:root` 中定义
- [ ] 暗色模式支持（v1 可选）
- [ ] Material Symbols Outlined 字体正确加载
- [ ] 字体家族配置（SF Pro，SF Mono 回退）

**验证步骤**:
- 打开浏览器开发者工具，检查 `:root` 是否包含所有变量
- 创建测试 div 使用 `bg-accent` 类，验证颜色与原型一致

**需要创建的文件**:
- `tailwind.config.js`
- `postcss.config.js`
- `src/index.css`（包含原型中的 CSS 变量）

---

### 任务 1.3: 定义 TypeScript 类型
**优先级**: P0 | **依赖**: 1.1 | **阻塞**: 所有服务、存储、组件

**描述**:
创建应用程序的所有 TypeScript 类型定义。

**验收标准**:
- [ ] `Prompt` 接口符合规格
- [ ] `Tag` 类型支持层级结构
- [ ] 文件系统类型（FileSystemHandle 包装器）
- [ ] UI 状态类型
- [ ] 所有类型从 `types/index.ts` 导出

**验证步骤**:
```typescript
import { Prompt, Tag, PromptFilter } from '@/types';
// 应该无编译错误
const prompt: Prompt = {
  id: '123',
  title: '测试',
  content: '内容',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  copyCount: 0,
  pinned: false,
};
```

**需要创建的文件**:
- `src/types/prompt.ts`
- `src/types/tag.ts`
- `src/types/file.ts`
- `src/types/ui.ts`
- `src/types/index.ts`

---

### 任务 1.4: 创建工具函数
**优先级**: P1 | **依赖**: 1.3 | **阻塞**: 服务层

**描述**:
实现核心工具函数：日期格式化、存储和辅助函数。

**验收标准**:
- [ ] `formatDate()` 格式化日期为 "今天"、"昨天" 或 "X 天前"
- [ ] `formatDateFull()` 格式化为 "2026-05-16"
- [ ] `localStorage` 包装器，支持 JSON 解析/序列化
- [ ] `generateId()` 创建唯一 ID
- [ ] `debounce()` 防抖函数用于搜索输入

**验证步骤**:
```typescript
import { formatDate, formatDateFull } from '@/utils/date';
formatDate(new Date()) === '今天';
formatDateFull(new Date()) === '2026-05-16';
```

**需要创建的文件**:
- `src/utils/date.ts`
- `src/utils/storage.ts`
- `src/utils/id.ts`
- `src/utils/debounce.ts`
- `src/utils/index.ts`

---

### 任务 1.5: 定义常量
**优先级**: P1 | **依赖**: 无 | **阻塞**: 服务层、UI

**描述**:
定义应用常量，包括配置、快捷键和默认值。

**验收标准**:
- [ ] `DEFAULT_PROMPT_TEMPLATE` 新 Prompt 模板
- [ ] `KEYBINDINGS` 包含所有快捷键的对象
- [ ] `TAG_COLORS` 数组与原型匹配
- [ ] `CONFIG` 应用设置对象
- [ ] `SUPPORTED_FILE_EXTENSIONS` = ['.md']

**需要创建的文件**:
- `src/constants/config.ts`
- `src/constants/keybindings.ts`
- `src/constants/defaults.ts`
- `src/constants/index.ts`

---

## 阶段 2: 文件系统基础

### 任务 2.1: 实现 FileService
**优先级**: P0 | **依赖**: 1.3, 1.5 | **阻塞**: fileStore, PromptService

**描述**:
创建 File System Access API 的封装，用于目录和文件操作。

**验收标准**:
- [ ] `openDirectory()` 调用 `showDirectoryPicker()`
- [ ] `readFile()` 读取文件内容为文本
- [ ] `writeFile()` 创建/覆盖文件
- [ ] `deleteFile()` 删除文件
- [ ] `listFiles()` 递归扫描 .md 文件
- [ ] `watchDirectory()` 检测文件变化（v1 可选）
- [ ] 浏览器兼容性检查，带友好错误提示

**验证步骤**:
```typescript
const dirHandle = await FileService.openDirectory();
const files = await FileService.listFiles(dirHandle);
// 应返回文件句柄数组
```

**需要创建的文件**:
- `src/services/fileService.ts`

---

### 任务 2.2: 实现 fileStore
**优先级**: P0 | **依赖**: 2.1 | **阻塞**: useDirectoryPicker

**描述**:
用于管理目录句柄和权限状态的 Zustand 存储。

**验收标准**:
- [ ] 存储将目录句柄持久化到 IndexedDB
- [ ] 跟踪 `isAuthorized` 状态
- [ ] 跟踪 `isSupported`（浏览器兼容性）
- [ ] `setDirectory()` 操作
- [ ] `clearDirectory()` 操作
- [ ] `checkPermission()` 操作

**验证步骤**:
```typescript
import { useFileStore } from '@/stores/fileStore';
const { isAuthorized, setDirectory } = useFileStore();
```

**需要创建的文件**:
- `src/stores/fileStore.ts`

---

### 任务 2.3: 实现 useDirectoryPicker Hook
**优先级**: P0 | **依赖**: 2.1, 2.2 | **阻塞**: 目录选择 UI

**描述**:
用于目录选择的自定义 Hook，带错误处理。

**验收标准**:
- [ ] 返回 `openDirectory()` 函数
- [ ] 返回 `isLoading`、`error`、`isSupported` 状态
- [ ] 浏览器不支持时显示有帮助的错误
- [ ] 请求读/写权限
- [ ] 处理用户取消

**需要创建的文件**:
- `src/hooks/useDirectoryPicker.ts`

---

### 任务 2.4: 创建目录选择 UI
**优先级**: P0 | **依赖**: 2.3 | **阻塞**: 无

**描述**:
带目录选择按钮的欢迎界面。

**验收标准**:
- [ ] 居中卡片布局
- [ ] 应用 Logo 和标题
- [ ] "选择数据目录" 按钮
- [ ] 浏览器兼容性消息
- [ ] 目录访问期间的加载状态
- [ ] 错误显示，带重试选项
- [ ] 匹配原型设计风格

**需要创建的文件**:
- `src/components/WelcomeScreen.tsx`

---

## 阶段 3: 数据层

### 任务 3.1: 实现 Markdown 工具
**优先级**: P0 | **依赖**: 1.4 | **阻塞**: PromptService

**描述**:
解析和序列化带 YAML frontmatter 的 Markdown。

**验收标准**:
- [ ] `parseMarkdown()` 提取标题、内容、标签和元数据
- [ ] `serializeMarkdown()` 创建带 frontmatter 的 MD
- [ ] `renderMarkdown()` 将 MD 转换为 HTML（使用 marked）
- [ ] 优雅处理缺失的 frontmatter
- [ ] 与 Obsidian 格式兼容

**验证步骤**:
```typescript
const md = `---
title: 测试
tags: [a, b]
---
内容`;
const parsed = parseMarkdown(md);
// parsed.title === '测试', parsed.tags === ['a', b']
```

**需要创建的文件**:
- `src/utils/markdown.ts`

---

### 任务 3.2: 实现 PromptService
**优先级**: P0 | **依赖**: 2.1, 3.1 | **阻塞**: promptStore, CreateModal

**描述**:
带文件持久化的 Prompt CRUD 操作。

**验收标准**:
- [ ] `loadPrompts(dirHandle)` - 加载所有 .md 文件
- [ ] `loadPrompt(fileHandle)` - 加载单个 prompt
- [ ] `createPrompt(dirHandle, prompt)` - 创建新文件
- [ ] `updatePrompt(fileHandle, prompt)` - 更新现有文件
- [ ] `deletePrompt(fileHandle)` - 删除带确认
- [ ] `createHistoryVersion()` - 复制到 .history/
- [ ] 所有函数返回类型化的 Promise

**需要创建的文件**:
- `src/services/promptService.ts`

---

### 任务 3.3: 实现 TagService
**优先级**: P1 | **依赖**: 3.1 | **阻塞**: tagStore, TagTree

**描述**:
将标签解析和组织为层级结构。

**验收标准**:
- [ ] `parseTags(tagString)` - 解析 "#计算机/Linux" 格式
- [ ] `buildTagTree(tags)` - 创建层级树
- [ ] `getTagColor(tag)` - 分配一致的颜色
- [ ] `filterByTag(tag, prompts)` - 按标签筛选
- [ ] `getTagStats()` - 返回每个标签的计数

**需要创建的文件**:
- `src/services/tagService.ts`

---

### 任务 3.4: 实现 SearchService
**优先级**: P0 | **依赖**: 无 | **阻塞**: CommandPalette, SearchInput

**描述**:
使用 FlexSearch 的全文搜索。

**验收标准**:
- [ ] 索引所有 prompts（标题、内容、标签）
- [ ] `search(query)` 返回排序结果
- [ ] 中文分词支持
- [ ] 搜索响应 < 100ms
- [ ] prompts 变化时重建索引

**需要创建的文件**:
- `src/services/searchService.ts`

---

### 任务 3.5: 实现 promptStore
**优先级**: P0 | **依赖**: 3.2 | **阻塞**: 所有 prompt 组件

**描述**:
Prompt 状态管理的 Zustand 存储。

**验收标准**:
- [ ] `prompts` 数组状态
- [ ] `filteredPrompts` 派生状态
- [ ] `setPrompts()` 操作
- [ ] `addPrompt()` 操作
- [ ] `updatePrompt()` 操作
- [ ] `deletePrompt()` 操作
- [ ] `toggleFavorite()` 操作
- [ ] `setFilter()` 操作（标签、搜索、收藏）

**需要创建的文件**:
- `src/stores/promptStore.ts`

---

### 任务 3.6: 实现 tagStore
**优先级**: P1 | **依赖**: 3.3 | **阻塞**: TagTree, Sidebar

**描述**:
标签状态管理的 Zustand 存储。

**验收标准**:
- [ ] `tags` 数组状态
- [ ] `tagTree` 层级状态
- [ ] `pinnedTags` 状态
- [ ] `setTags()` 操作
- [ ] `togglePin()` 操作
- [ ] `getTagColor()` 获取器

**需要创建的文件**:
- `src/stores/tagStore.ts`

---

### 任务 3.7: 实现 uiStore
**优先级**: P1 | **依赖**: 无 | **阻塞**: 所有 UI 组件

**描述**:
UI 状态（面板、模态框、加载）的 Zustand 存储。

**验收标准**:
- [ ] `isDetailPanelOpen` 状态
- [ ] `isCreateModalOpen` 状态
- [ ] `isCommandPaletteOpen` 状态
- [ ] `selectedPromptId` 状态
- [ ] `selectedPromptIds`（批量）状态
- [ ] `isLoading` 状态
- [ ] 所有状态的切换/设置操作

**需要创建的文件**:
- `src/stores/uiStore.ts`

---

## 阶段 4: UI 基础

### 任务 4.1: 创建通用组件
**优先级**: P0 | **依赖**: 1.2 | **阻塞**: 所有 UI 组件

**描述**:
构建与原型匹配的可复用 UI 组件。

**验收标准**:
- [ ] `Button` - 变体: primary, secondary, ghost
- [ ] `IconButton` - 仅图标按钮
- [ ] `Modal` - 遮罩 + 面板 + 关闭按钮
- [ ] `Overlay` - 背景遮罩
- [ ] `Spinner` - 加载指示器
- [ ] 所有组件匹配原型设计

**需要创建的文件**:
- `src/components/common/Button.tsx`
- `src/components/common/IconButton.tsx`
- `src/components/common/Modal.tsx`
- `src/components/common/Overlay.tsx`
- `src/components/common/Spinner.tsx`
- `src/components/common/index.ts`

---

### 任务 4.2: 创建应用布局
**优先级**: P0 | **依赖**: 4.1 | **阻塞**: 功能组件

**描述**:
带 Sidebar 和 Main 区域的主应用布局。

**验收标准**:
- [ ] `Sidebar` - 260px 宽度，可折叠
- [ ] `TopBar` - 标题、搜索触发器、新建按钮
- [ ] 主内容区域，正确的溢出处理
- [ ] 响应式布局（移动端：隐藏侧栏）
- [ ] 匹配原型间距和颜色

**需要创建的文件**:
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/TopBar.tsx`
- `src/App.tsx`（更新布局）

---

### 任务 4.3: 创建详情面板外壳
**优先级**: P0 | **依赖**: 4.1, 3.7 | **阻塞**: PromptContent

**描述**:
右侧滑入的 prompt 详情面板。

**验收标准**:
- [ ] 480px 宽度面板
- [ ] 从右侧滑入动画
- [ ] 带模糊的背景遮罩
- [ ] 关闭按钮 (X) 和 ESC 键支持
- [ ] 顶部工具栏占位符
- [ ] 内容滚动区域

**需要创建的文件**:
- `src/components/layout/DetailPanel.tsx`

---

## 阶段 5: Prompt 展示

### 任务 5.1: 创建 PromptCard 组件
**优先级**: P0 | **依赖**: 4.1 | **阻塞**: PromptGrid

**描述**:
带预览信息的单个 prompt 卡片。

**验收标准**:
- [ ] 显示标题、预览（2 行）、标签
- [ ] 显示相对日期和字符计数
- [ ] 悬停时的阴影效果
- [ ] 收藏图标（收藏时填充）
- [ ] 更多选项菜单（...）
- [ ] 点击打开详情面板
- [ ] 匹配原型卡片设计

**需要创建的文件**:
- `src/components/prompt/PromptCard.tsx`

---

### 任务 5.2: 创建 TagPill 组件
**优先级**: P0 | **依赖**: 4.1 | **阻塞**: PromptCard, DetailPanel

**描述**:
带颜色编码的小标签徽章。

**验收标准**:
- [ ] 四种颜色变体: blue, purple, violet, gray
- [ ] 圆角胶囊形状
- [ ] 一致的大小
- [ ] 可选的删除 "x" 按钮

**需要创建的文件**:
- `src/components/tag/TagPill.tsx`

---

### 任务 5.3: 创建 PromptGrid 组件
**优先级**: P0 | **依赖**: 5.1, 5.2 | **阻塞**: 无

**描述**:
Prompt 卡片的网格布局。

**验收标准**:
- [ ] 响应式网格（最小 300px 列）
- [ ] 卡片之间 16px 间距
- [ ] 可滚动容器
- [ ] 空状态消息
- [ ] 加载状态

**需要创建的文件**:
- `src/components/prompt/PromptGrid.tsx`

---

### 任务 5.4: 实现 Markdown 渲染
**优先级**: P0 | **依赖**: 3.1 | **阻塞**: PromptContent

**描述**:
将 Markdown 内容渲染为带样式的 HTML。

**验收标准**:
- [ ] 标题 (h1-h6) 样式
- [ ] 列表（有序、无序）
- [ ] 代码块带语法高亮
- [ ] 行内代码带背景
- [ ] 链接正确样式
- [ ] 保留换行

**需要创建的文件**:
- `src/components/prompt/PromptContent.tsx`
- `src/index.css`（添加 markdown 样式）

---

### 任务 5.5: 完成详情面板
**优先级**: P0 | **依赖**: 4.3, 5.2, 5.4 | **阻塞**: 无

**描述**:
将详情面板连接到实际的 prompt 数据。

**验收标准**:
- [ ] 显示完整的 prompt 标题
- [ ] 将所有标签显示为 TagPills
- [ ] 显示元数据（字符计数、复制计数、日期）
- [ ] 渲染完整的 markdown 内容
- [ ] 复制按钮复制内容到剪贴板
- [ ] 编辑按钮打开编辑模态框
- [ ] 收藏切换工作

**需要更新的文件**:
- `src/components/layout/DetailPanel.tsx`

---

### 任务 5.6: 连接数据到 UI
**优先级**: P0 | **依赖**: 3.5, 3.6, 5.3 | **阻塞**: 无

**描述**:
将所有存储连接以显示真实数据。

**验收标准**:
- [ ] 应用启动时从目录加载 prompts
- [ ] Prompts 在网格中显示
- [ ] 标签统计显示正确计数
- [ ] 筛选胶囊（全部、最近、收藏）工作
- [ ] 点击卡片显示正确详情

**需要更新的文件**:
- `src/App.tsx`

---

## 阶段 6: Prompt 创建

### 任务 6.1: 创建 CreateModal 组件
**优先级**: P0 | **依赖**: 4.1 | **阻塞**: 无

**描述**:
用于创建新 prompts 的模态框。

**验收标准**:
- [ ] 标题输入字段
- [ ] 内容的大文本区域
- [ ] 标签选择器
- [ ] 字符计数
- [ ] 保存/取消按钮
- [ ] 表单验证
- [ ] 匹配原型模态框设计

**需要创建的文件**:
- `src/components/prompt/CreateModal.tsx`

---

### 任务 6.2: 创建 TagSelect 组件
**优先级**: P0 | **依赖**: 3.6 | **阻塞**: CreateModal

**描述**:
带自动完成和多选的标签输入。

**验收标准**:
- [ ] 输入搜索现有标签
- [ ] 回车创建新标签
- [ ] X 删除选中的标签
- [ ] 将选中项显示为胶囊
- [ ] 显示热门标签建议

**需要创建的文件**:
- `src/components/tag/TagSelect.tsx`

---

### 任务 6.3: 实现创建 Prompt 流程
**优先级**: P0 | **依赖**: 3.2, 6.1, 6.2 | **阻塞**: 无

**描述**:
将创建模态框连接到文件系统。

**验收标准**:
- [ ] 点击"新建"打开模态框
- [ ] 保存创建新的 .md 文件
- [ ] 文件具有正确的 frontmatter
- [ ] 新 prompt 出现在网格中
- [ ] 保存时模态框关闭
- [ ] 保存失败的错误处理

**需要更新的文件**:
- `src/App.tsx`
- `src/components/prompt/CreateModal.tsx`

---

## 阶段 7: Prompt 编辑与删除

### 任务 7.1: 实现编辑模式
**优先级**: P0 | **依赖**: 6.1 | **阻塞**: 无

**描述**:
重用 CreateModal 编辑现有 prompts。

**验收标准**:
- [ ] 编辑按钮用现有数据填充模态框
- [ ] 模态框标题更改为"编辑 Prompt"
- [ ] 保存更新现有文件
- [ ] 更改立即在 UI 中反映
- [ ] 保存前创建历史版本

**需要更新的文件**:
- `src/components/prompt/CreateModal.tsx`

---

### 任务 7.2: 实现带确认的删除
**优先级**: P0 | **依赖**: 3.2 | **阻塞**: 无

**描述**:
带确认对话框的 prompt 删除。

**验收标准**:
- [ ] 删除按钮显示确认
- [ ] 确认说明操作是永久性的
- [ ] 确认删除文件
- [ ] Prompt 从网格中移除
- [ ] 可选: 移动到 .trash/ 而不是直接删除

**需要创建的文件**:
- `src/components/prompt/DeleteConfirm.tsx`

---

### 任务 7.3: 实现历史版本
**优先级**: P1 | **依赖**: 3.2 | **阻塞**: 无

**描述**:
编辑前创建备份副本。

**验收标准**:
- [ ] 保存前将当前版本复制到 .history/
- [ ] 文件名包含时间戳
- [ ] 每个 prompt 最多 10 个历史版本
- [ ] 旧版本自动清理

**需要更新的文件**:
- `src/services/promptService.ts`

---

## 阶段 8: 搜索与导航

### 任务 8.1: 创建 SearchInput 组件
**优先级**: P0 | **依赖**: 3.4 | **阻塞**: TopBar, CommandPalette

**描述**:
带防抖的搜索输入。

**验收标准**:
- [ ] 防抖输入（300ms）
- [ ] 有文本时显示清除按钮
- [ ] 搜索期间加载指示器
- [ ] 结果计数显示

**需要创建的文件**:
- `src/components/command/SearchInput.tsx`

---

### 任务 8.2: 创建 TagTree 组件
**优先级**: P0 | **依赖**: 3.3 | **阻塞**: Sidebar

**描述**:
带展开/折叠的分层标签树。

**验收标准**:
- [ ] 带缩进的树结构
- [ ] 父标签的展开/折叠
- [ ] 标签计数徽章
- [ ] 置顶标签部分
- [ ] 点击按标签筛选
- [ ] 活动状态样式

**需要创建的文件**:
- `src/components/tag/TagTree.tsx`

---

### 任务 8.3: 连接搜索和标签筛选
**优先级**: P0 | **依赖**: 8.1, 8.2 | **阻塞**: 无

**描述**:
将搜索和标签筛选连接到 prompt 显示。

**验收标准**:
- [ ] 搜索查询实时筛选网格
- [ ] 点击标签按该标签筛选
- [ ] 筛选一起工作（AND 逻辑）
- [ ] 清除筛选按钮
- [ ] 活动筛选指示器

**需要更新的文件**:
- `src/App.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`

---

## 阶段 9: 命令面板

### 任务 9.1: 创建 CommandPalette 组件
**优先级**: P0 | **依赖**: 8.1 | **阻塞**: 无

**描述**:
Cmd+K 命令面板用于快速操作。

**验收标准**:
- [ ] Cmd+K / Ctrl+K 打开
- [ ] ESC 关闭
- [ ] 打开时搜索输入聚焦
- [ ] 键盘导航（方向键 + 回车）
- [ ] 部分: 最近、操作、搜索结果
- [ ] 匹配原型设计

**需要创建的文件**:
- `src/components/command/CommandPalette.tsx`

---

### 任务 9.2: 实现键盘快捷键
**优先级**: P1 | **依赖**: 无 | **阻塞**: 无

**描述**:
全局键盘快捷键处理。

**验收标准**:
- [ ] Cmd+K: 命令面板
- [ ] Cmd+N: 新建 prompt
- [ ] ESC: 关闭面板/模态框
- [ ] Cmd+1/2/3: 快速切换筛选
- [ ] 无浏览器默认快捷键冲突

**需要创建的文件**:
- `src/hooks/useKeyboardShortcuts.ts`

---

### 任务 9.3: 填充命令面板操作
**优先级**: P0 | **依赖**: 9.1 | **阻塞**: 无

**描述**:
向命令面板添加快速操作。

**验收标准**:
- [ ] "新建 Prompt" 操作
- [ ] "导入" 操作
- [ ] "导出" 操作
- [ ] "设置" 操作（占位符）
- [ ] 最近 prompts 列表
- [ ] 所有可搜索

**需要更新的文件**:
- `src/components/command/CommandPalette.tsx`

---

## 阶段 10: 批量操作与导出

### 任务 10.1: 实现批量选择
**优先级**: P1 | **依赖**: 5.1 | **阻塞**: 无

**描述**:
Prompts 的多选。

**验收标准**:
- [ ] 每个卡片上的复选框
- [ ] 全选复选框
- [ ] 选中项目时出现批量操作栏
- [ ] 清除选择按钮

**需要更新的文件**:
- `src/components/prompt/PromptCard.tsx`
- `src/components/prompt/PromptGrid.tsx`

---

### 任务 10.2: 实现批量删除
**优先级**: P1 | **依赖**: 10.1 | **阻塞**: 无

**描述**:
一次删除多个 prompts。

**验收标准**:
- [ ] 删除选中的 prompts 操作
- [ ] 带计数的确认
- [ ] 删除所有选中的文件
- [ ] 正确更新网格

**需要创建的文件**:
- `src/services/batchService.ts`

---

### 任务 10.3: 实现 ExportService
**优先级**: P1 | **依赖**: 无 | **阻塞**: 无

**描述**:
将 prompts 导出为 JSON、CSV 或 MD 归档。

**验收标准**:
- [ ] `exportJSON()` - prompt 对象数组
- [ ] `exportCSV()` - 表格格式
- [ ] `exportMDArchive()` - .md 文件的 zip
- [ ] 自动触发下载

**需要创建的文件**:
- `src/services/exportService.ts`

---

### 任务 10.4: 创建导出 UI
**优先级**: P1 | **依赖**: 10.3 | **阻塞**: 无

**描述**:
导出选项界面。

**验收标准**:
- [ ] 顶部栏中的导出按钮
- [ ] 格式选择（JSON/CSV/MD）
- [ ] "全部导出" vs "导出选中"
- [ ] 大型导出的进度指示器

**需要创建的文件**:
- `src/components/export/ExportModal.tsx`

---

## 最终任务

### 任务 11.1: 实现 usePromptActions Hook
**优先级**: P0 | **依赖**: 3.5, 7.1 | **阻塞**: 无

**描述**:
将 prompt CRUD 操作整合到一个 hook 中。

**验收标准**:
- [ ] 返回 `create`、`update`、`delete`、`duplicate` 函数
- [ ] 处理加载/错误状态
- [ ] 显示 toast 通知
- [ ] 操作后刷新 prompt 列表

**需要创建的文件**:
- `src/hooks/usePromptActions.ts`

---

### 任务 11.2: 添加 Toast 通知
**优先级**: P1 | **依赖**: 无 | **阻塞**: 无

**描述**:
用于用户反馈的 toast 通知系统。

**验收标准**:
- [ ] 成功 toasts（绿色）
- [ ] 错误 toasts（红色）
- [ ] 信息 toasts（蓝色）
- [ ] 3 秒后自动关闭
- [ ] 手动关闭选项

**需要创建的文件**:
- `src/components/common/Toast.tsx`
- `src/stores/toastStore.ts`

---

### 任务 11.3: 添加错误边界
**优先级**: P1 | **依赖**: 无 | **阻塞**: 无

**描述**:
用于优雅错误处理的 React 错误边界。

**验收标准**:
- [ ] 捕获组件错误
- [ ] 显示友好的错误消息
- [ ] "重新加载" 按钮恢复
- [ ] 将错误记录到控制台

**需要创建的文件**:
- `src/components/common/ErrorBoundary.tsx`

---

### 任务 11.4: 打磨和性能
**优先级**: P1 | **依赖**: 所有 | **阻塞**: 无

**描述**:
最终打磨和性能优化。

**验收标准**:
- [ ] 所有动画流畅（60fps）
- [ ] 搜索 < 100ms
- [ ] 无控制台错误或警告
- [ ] Lighthouse 分数 > 90
- [ ] 响应式设计验证
- [ ] 可访问性: 键盘导航、ARIA 标签

---

### 任务 11.5: 文档
**优先级**: P2 | **依赖**: 所有 | **阻塞**: 无

**描述**:
更新 README 的设置和使用说明。

**验收标准**:
- [ ] 先决条件（浏览器要求）
- [ ] 设置说明
- [ ] 开发命令
- [ ] 构建说明
- [ ] 故障排除部分

**需要更新的文件**:
- `README.md`

---

## 总结

**任务总数**: 47

**按优先级**:
- P0（关键）: 32 个任务
- P1（高）: 13 个任务
- P2（中）: 2 个任务

**按阶段**:
1. 基础与配置: 5 个任务
2. 文件系统基础: 4 个任务
3. 数据层: 7 个任务
4. UI 基础: 3 个任务
5. Prompt 展示: 6 个任务
6. Prompt 创建: 3 个任务
7. Prompt 编辑与删除: 3 个任务
8. 搜索与导航: 3 个任务
9. 命令面板: 3 个任务
10. 批量操作与导出: 4 个任务
11. 最终任务: 5 个任务
