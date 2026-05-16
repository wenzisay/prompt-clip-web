# PromptClip Web Technical Specification

## 1. Objective

**产品定位**：一款面向 AI 重度用户的个人 Prompt 管理工具，帮助用户高效保存、组织、复用和优化 AI 提示词。

**核心价值**：
- 快速访问：从打开到使用不超过 3 秒
- 智能组织：多级标签树，快速筛选
- 无缝集成：快速复制，一键使用
- 隐私优先：本地数据，用户完全掌控

**第一版范围**：
- Web 纯前端版本（非 Tauri 桌面应用）
- 使用 File System Access API 实现本地文件读写
- 用户授权本地目录后，直接操作 MD 文件
- 包含：历史版本管理、命令面板、批量操作

**目标用户**：
- 核心：每天频繁使用 AI 工具的专业人士
- 次级：内容创作者、开发者、营销人员、产品经理、设计师

---

## 2. Commands

### 2.1 用户交互命令

| 命令 | 触发方式 | 描述 |
|------|----------|------|
| `initApp` | 应用启动 | 初始化应用，检查目录授权状态，加载缓存 |
| `openDirectory` | 点击"选择数据目录" | 调用 `showDirectoryPicker()` 获取目录句柄 |
| `loadPrompts` | 目录授权后 | 递归扫描目录，解析所有 MD 文件 |
| `createPrompt` | 点击"新建 Prompt" | 创建新 MD 文件，写入 frontmatter |
| `updatePrompt` | 编辑保存 | 更新现有 MD 文件内容 |
| `deletePrompt` | 删除操作 | 删除 MD 文件（移入 `.trash/` 或直接删除） |
| `searchPrompts` | 搜索输入 | 使用 FlexSearch 全文检索 |
| `copyPrompt` | 点击复制按钮 | 复制 Prompt 内容到剪贴板 |
| `toggleFavorite` | 点击收藏图标 | 切换 frontmatter 中的 `pinned` 状态 |
| `openDetail` | 点击卡片 | 打开右侧详情面板 |
| `closeDetail` | 点击关闭/遮罩 | 关闭右侧详情面板 |
| `openCommandPalette` | Cmd+K / Ctrl+K | 打开命令面板 |
| `batchDelete` | 批量选择后删除 | 批量删除选中的 Prompt |
| `batchExport` | 批量选择后导出 | 导出为 JSON/CSV/MD 压缩包 |
| `createHistoryVersion` | 保存编辑前 | 将当前版本复制到 `.history/` 目录 |

### 2.2 开发命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建
npm run preview

# 类型检查
npm run type-check

# Lint
npm run lint
```

---

## 3. Project Structure

```
prompt-clip-web/
├── src/
│   ├── main.tsx                 # 应用入口
│   ├── App.tsx                  # 根组件
│   ├── index.css                # 全局样式 + CSS 变量
│   │
│   ├── components/              # UI 组件
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # 侧边栏（导航 + 标签树）
│   │   │   ├── TopBar.tsx       # 顶部栏（标题 + 搜索 + 新建按钮）
│   │   │   └── DetailPanel.tsx  # 右侧详情面板
│   │   ├── prompt/
│   │   │   ├── PromptCard.tsx   # Prompt 卡片
│   │   │   ├── PromptGrid.tsx   # 卡片网格布局
│   │   │   ├── CreateModal.tsx  # 新建/编辑弹窗
│   │   │   └── PromptContent.tsx # Prompt 内容渲染（支持 Markdown）
│   │   ├── tag/
│   │   │   ├── TagTree.tsx      # 标签树组件
│   │   │   ├── TagPill.tsx      # 标签胶囊
│   │   │   └── TagSelect.tsx    # 标签选择器
│   │   ├── command/
│   │   │   ├── CommandPalette.tsx  # 命令面板 (Cmd+K)
│   │   │   └── SearchInput.tsx     # 搜索输入框
│   │   └── common/
│   │       ├── Button.tsx       # 按钮
│   │       ├── IconButton.tsx   # 图标按钮
│   │       ├── Modal.tsx        # 通用模态框
│   │       ├── Overlay.tsx      # 遮罩层
│   │       └── Spinner.tsx      # 加载指示器
│   │
│   ├── stores/                  # Zustand 状态管理
│   │   ├── promptStore.ts       # Prompt 状态
│   │   ├── tagStore.ts          # 标签状态
│   │   ├── uiStore.ts           # UI 状态（面板、模态框）
│   │   └── fileStore.ts         # 文件系统句柄状态
│   │
│   ├── services/                # 业务逻辑
│   │   ├── fileService.ts       # File System Access API 封装
│   │   ├── promptService.ts     # Prompt CRUD + 历史版本
│   │   ├── tagService.ts        # 标签解析与管理
│   │   ├── searchService.ts     # FlexSearch 封装
│   │   └── exportService.ts     # 导出功能
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useDirectoryPicker.ts  # 目录选择
│   │   ├── usePromptActions.ts    # Prompt 操作
│   │   ├── useSearch.ts           # 搜索
│   │   ├── useKeyboardShortcuts.ts # 快捷键
│   │   └── useDebounce.ts         # 防抖
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── prompt.ts            # Prompt 相关类型
│   │   ├── tag.ts               # 标签类型
│   │   ├── file.ts              # 文件系统类型
│   │   └── ui.ts                # UI 状态类型
│   │
│   ├── utils/                   # 工具函数
│   │   ├── markdown.ts          # Markdown 解析 (gray-matter + marked)
│   │   ├── date.ts              # 日期格式化
│   │   ├── search.ts            # 搜索工具
│   │   └── storage.ts           # LocalStorage 封装
│   │
│   └── constants/               # 常量
│       ├── config.ts            # 应用配置
│       ├── keybindings.ts       # 快捷键定义
│       └── defaults.ts          # 默认值
│
├── public/                      # 静态资源
│   └── fonts/                   # 字体文件（如需要）
│
├── docs/                        # 文档
│   ├── PromptClip-Web-PRD-1.0.0.md
│   └── promptclip-web.html      # UI 原型
│
├── index.html                   # HTML 模板
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── tailwind.config.js           # Tailwind 配置
├── package.json
└── SPEC.md                      # 本文档
```

---

## 4. Code Style

### 4.1 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `PromptCard.tsx`, `CommandPalette.tsx` |
| 工具函数 | camelCase | `formatDate()`, `parseTags()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PROMPTS`, `DEFAULT_PAGE_SIZE` |
| 类型/接口 | PascalCase | `interface Prompt`, `type TagTree` |
| 布尔变量 | is/has/should 前缀 | `isLoading`, `hasPermission`, `shouldUpdate` |
| 事件处理 | handle 前缀 | `handleClick()`, `handleSubmit()` |
| 异步函数 | 无特殊前缀，返回 Promise | `fetchPrompts()`, `savePrompt()` |

### 4.2 TypeScript 规范

```typescript
// 优先使用 interface 定义对象形状
interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  copyCount: number;
  pinned: boolean;
}

// 使用 type 定义联合类型或工具类型
type TagColor = 'blue' | 'purple' | 'violet' | 'gray';
type PromptId = string;

// 避免使用 any，使用 unknown
function parseInput(input: unknown): Prompt {
  if (isPrompt(input)) {
    return input;
  }
  throw new Error('Invalid prompt');
}

// 函数返回类型显式声明
async function loadPrompts(): Promise<Prompt[]> {
  // ...
}
```

### 4.3 React 组件规范

```tsx
// 函数组件 + Hooks
import { useState, useCallback } from 'react';

interface PromptCardProps {
  prompt: Prompt;
  onClick: (id: string) => void;
  onCopy: (id: string) => void;
}

export function PromptCard({ prompt, onClick, onCopy }: PromptCardProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = useCallback(() => {
    setIsCopying(true);
    onCopy(prompt.id);
    setTimeout(() => setIsCopying(false), 1000);
  }, [prompt.id, onCopy]);

  return (
    <article className="prompt-card" onClick={() => onClick(prompt.id)}>
      {/* ... */}
    </article>
  );
}

// 组件文件结构：
// 1. Imports
// 2. Types/Interfaces
// 3. Constants
// 4. Component
// 5. Exports
```

### 4.4 样式规范

```css
/* 使用 Tailwind + CSS 变量 */
/* 全局变量定义在 index.css */
:root {
  --accent: #0058bc;
  --secondary: #4c4aca;
  /* ... */
}

/* 复杂动画/自定义样式使用 CSS 模块或内联样式 */
/* 保持与原型设计一致 */
```

### 4.5 注释规范

```typescript
/**
 * 加载并解析目录中的所有 Prompt 文件
 * @param dirHandle - 目录句柄
 * @returns Promise<Prompt[]> 解析后的 Prompt 列表
 * @throws {Error} 目录读取失败或文件解析失败
 */
async function loadPrompts(dirHandle: FileSystemDirectoryHandle): Promise<Prompt[]> {
  // ...
}

// 单行注释用于解释复杂逻辑
// TODO: 标记待完成功能
// FIXME: 标记需要修复的问题
```

---

## 5. Testing Strategy

### 5.1 测试层级

| 层级 | 工具 | 覆盖目标 |
|------|------|----------|
| 单元测试 | Vitest | 工具函数、服务层、Hooks |
| 组件测试 | Vitest + Testing Library | UI 组件交互 |
| E2E 测试 | Playwright | 关键用户流程 |

### 5.2 测试重点

**必须测试**：
1. 文件系统操作（mock `showDirectoryPicker`）
2. Markdown 解析（gray-matter + marked）
3. 搜索功能（FlexSearch）
4. 状态管理（Zustand store actions）
5. 关键用户交互：创建、编辑、删除、复制

**测试文件结构**：
```
src/
├── components/
│   └── __tests__/
│       ├── PromptCard.test.tsx
│       └── CommandPalette.test.tsx
├── services/
│   └── __tests__/
│       ├── promptService.test.ts
│       └── searchService.test.ts
└── hooks/
    └── __tests__/
        └── usePromptActions.test.ts
```

### 5.3 测试命令

```bash
npm run test           # 运行所有测试
npm run test:ui        # Vitest UI
npm run test:e2e       # Playwright E2E
npm run coverage       # 覆盖率报告
```

---

## 6. Boundaries

### 6.1 Always Do (必须遵守)

1. **本地优先**：所有数据存储在用户本地，不发送到服务器
2. **File System Access API**：使用浏览器原生文件 API，不使用 IndexedDB 作为主存储
3. **Markdown 格式**：Prompt 文件使用 Markdown + YAML Frontmatter，与 Obsidian 兼容
4. **类型安全**：所有代码必须通过 TypeScript 类型检查
5. **用户授权**：每次访问文件都需要用户明确授权
6. **错误处理**：文件操作失败时给用户友好提示
7. **性能优先**：搜索 < 100ms，列表滚动流畅（虚拟滚动）
8. **设计还原**：UI 严格按照 `docs/promptclip-web.html` 原型实现

### 6.2 Ask First (需要确认)

1. **浏览器兼容性降级**：File System Access API 不支持时的降级方案
2. **大量文件处理**：当 Prompt 数量 > 1000 时的性能优化策略
3. **并发写入**：多个标签页同时编辑同一文件的处理
4. **导出格式细节**：JSON/CSV 导出的具体字段和格式
5. **快捷键冲突**：用户自定义快捷键的需求

### 6.3 Never Do (禁止事项)

1. **禁止收集用户数据**：不添加任何分析或追踪代码
2. **禁止第三方云存储**：第一版不集成任何云同步服务
3. **禁止破坏性删除**：删除操作应先确认，或提供 `.trash/` 回收机制
4. **禁止阻塞主线程**：大文件操作使用 Web Workers 或分块处理
5. **禁止硬编码路径**：不假设用户的目录结构
6. **禁止自动保存覆盖**：编辑时的自动保存应有版本控制
7. **禁止绕过权限检查**：不尝试绕过浏览器的安全限制

---

## 7. Technical Constraints

### 7.1 浏览器要求

- **最低支持**：Chrome 86+, Edge 86+, Safari 不支持 File System Access API
- **降级提示**：不支持时提示用户使用 Chrome/Edge 或下载桌面版

### 7.2 性能要求

| 指标 | 目标 |
|------|------|
| 首屏加载 | < 1s |
| 搜索响应 | < 100ms |
| Prompt 切换 | < 300ms |
| 支持文件数 | 10,000+ |

### 7.3 依赖版本

```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "zustand": "^5.0.0",
  "flexsearch": "^0.7.43",
  "gray-matter": "^4.0.4",
  "marked": "^13.0.0",
  "vite": "^6.0.0",
  "typescript": "^5.6.0"
}
```

---

## 8. Acceptance Criteria

第一版完成标准：

- [ ] 用户可以选择本地数据目录
- [ ] 扫描并加载目录中的所有 MD 文件
- [ ] 卡片形式展示所有 Prompt
- [ ] 点击卡片打开详情面板
- [ ] 新建 Prompt（自动生成 MD 文件）
- [ ] 编辑 Prompt（实时保存到 MD）
- [ ] 删除 Prompt（确认后删除文件）
- [ ] 全文搜索（标题 + 内容 + 标签）
- [ ] 标签树展示和筛选
- [ ] 收藏功能
- [ ] 快速复制
- [ ] Cmd+K 命令面板
- [ ] 历史版本管理（保存到 `.history/`）
- [ ] 批量操作（删除、导出）
- [ ] 导出为 JSON/CSV

---

## 9. Implementation Phases

### Phase 1: 基础框架（Week 1）
- Vite + React + TypeScript 项目搭建
- Tailwind CSS 配置
- 基础布局（Sidebar + Main + DetailPanel）
- Zustand stores 结构

### Phase 2: 文件系统（Week 2）
- File System Access API 封装
- MD 文件解析（gray-matter）
- 文件监控和重载
- 错误处理

### Phase 3: 核心功能（Week 3-4）
- Prompt CRUD
- 标签系统
- 搜索（FlexSearch）
- UI 交互完成

### Phase 4: 高级功能（Week 5）
- 命令面板
- 历史版本
- 批量操作
- 导出功能

### Phase 5: 测试与优化（Week 6）
- 单元测试
- 性能优化
- 浏览器兼容性测试
- Bug 修复
