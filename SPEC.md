# 回收站管理功能 - 规格文档

## 0. 修订日志

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0 | 2025-06-17 | 初稿 |
| 1.1 | 2026-06-17 | 修订 trashBase 解析与恢复流程（P0）；i18n 化"-恢复"后缀；ModalType 改 camelCase；恢复部分失败策略；emptyRecycleBin 改串行；明确只读详情、列表刷新、目录扫描方式；i18n 键清单扩到 4 语言 |

---

## 1. 目标

为 PromptClip 添加完整的回收站管理功能，允许用户查看、管理和恢复被删除的 Prompts 及其关联数据（批注、历史版本）。

### 核心目标

1. **可见性**：提供侧边栏入口和命令面板入口，让用户能够轻松访问回收站
2. **完整性**：恢复时同时恢复 Prompt 内容、批注、批注附件
3. **安全性**：防止误删，提供批量操作能力
4. **一致性**：与现有 UI/UX 风格保持一致

---

## 2. 已有实现分析

### 2.1 删除机制（已实现）

当前删除功能在 `src/services/promptService.ts` 的 `deletePrompt` 函数（L290-316）中实现：

```typescript
const trashName = isStableId(prompt.id) && !prompt.isTemporaryLegacyId
  ? prompt.id                                              // 形如 abc123
  : basenameWithoutMarkdownExtension(basenameFromPath(filename)); // 形如 我的标题
const trashBase = `${trashName}.${timestamp}`;             // timestamp = YYYY-MM-DD-HHMMSS
const trashFilename = `${trashBase}.md`;
```

**关键点**：trashBase 的前半段并不总是 stableId —— **legacy 文件（无 stableId 或 `isTemporaryLegacyId`）的 base 实际是 basename**。因此恢复时**不能**直接拿 trashBase 当作新的 promptId。

### 2.2 回收站目录结构

```
_promptclip/
├── .trash/                    # 回收站目录
│   ├── *.md                  # 被删除的 Prompt 文件（${trashBase}.md）
│   ├── annotations/           # 被删除的批注 JSON
│   │   └── ${trashBase}.json
│   └── assets/               # 被删除的批注附件
│       └── ${trashBase}/
├── .history/                 # 历史版本目录（独立于回收站）
├── annotations/              # 活跃的批注 JSON
│   └── ${promptId}.json
└── assets/                   # 活跃的批注附件
    └── ${promptId}/
```

### 2.3 批注存储（已实现）

批注数据存储在两个位置：

1. **批注 JSON**：`_promptclip/annotations/${promptId}.json`
2. **批注附件**：`_promptclip/assets/${promptId}/${annotationId}/`

删除时通过 `AnnotationService.movePromptAnnotationsToTrash` 移动到：
- JSON：`_promptclip/.trash/annotations/${trashBase}.json`
- 附件：`_promptclip/.trash/assets/${trashBase}/`

### 2.4 历史版本存储（已实现）

历史版本存储在 `_promptclip/.history/` 目录，文件名格式 `${prompt.id}.${timestamp}.md`。

**注意**：历史版本不在删除/恢复范围内，它们是独立的版本管理功能。

### 2.5 已具备的基础能力（无需新造轮子）

| 能力 | 位置 | 用途 |
|---|---|---|
| `formatDateForFile(date)` | `utils/id.ts:114` | 时间戳格式化：`YYYY-MM-DD-HHMMSS` |
| `filenameFromTitle(title)` | `utils/id.ts:74` | 标题 → `${title.trim()}.md` |
| `validatePromptTitle(...)` | `services/promptService.ts:405` | 校验标题合法性 + 冲突，抛业务错误 |
| `repository.remove({recursive:true})` | `services/fileRepository/webFileRepository.ts:405` | **支持递归删除目录** |
| `parseFrontmatterOnly` / `parseMarkdown` | `utils/markdown.ts` | 解析 trash 文件 frontmatter |
| `loadPrompts` | `services/promptService.ts:87` | 恢复后重新扫描，触发 stableId 分配 |

---

## 3. 功能需求

### 3.1 UI 入口

#### 3.1.1 侧边栏入口

在 `src/components/layout/Sidebar.tsx` 中，**在标签树容器（L61-69 的 `flex-1 overflow-y-auto` div）与底部存储区（L72 起的 `border-t` div）之间**插入回收站入口。仅在 `!isCollapsed` 时渲染（与现有约定一致）：

```tsx
{/* 标签树 */}
{!isCollapsed && (
  <div className="flex-1 overflow-y-auto">
    <div className="px-3 py-3">
      <h2 className="...">{t.app.tags}</h2>
      <TagTree />
    </div>
  </div>
)}

{/* 新增：回收站入口（仅展开时显示） */}
{!isCollapsed && (
  <div className="px-3 py-2 border-t border-border">
    <button
      onClick={() => openModal('recycleBin')}
      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-dim transition-colors text-left"
    >
      <span className="material-symbols-outlined text-muted">delete</span>
      <span className="text-sm text-fg">{t.recycle.title}</span>
    </button>
  </div>
)}

{/* 底部存储状态 */}
{!isCollapsed && ( /* 原有代码不动 */ )}
```

#### 3.1.2 命令面板入口

在 `src/components/command/CommandPalette.tsx` 的 `createBaseCommands` 中添加：

```typescript
{
  id: 'open-recycle-bin',
  label: t.recycle.commandOpen,
  icon: 'delete',
  action: () => {
    closeCommandPalette();
    openModal('recycleBin');
  },
  category: 'action',
}
```

> 不要传 `shortcut: ''` —— 现有命令风格是缺省即视为无快捷键。

### 3.2 回收站视图

#### 3.2.1 Modal 结构

创建 `src/components/recycle/RecycleModal.tsx`：

**功能**：
- 显示被删除的 Prompt 列表
- 每个卡片显示：标题、删除时间、预览
- 操作按钮：查看详情、恢复、永久删除
- 底部操作：全部清空

**UI 布局**：
```
┌─────────────────────────────────────────┐
│ 回收站                          [×]      │
├─────────────────────────────────────────┤
│                           [全部清空]     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Prompt 标题             2025-01-15   │ │
│ │ 预览内容预览内容预览...               │ │
│ │ [查看] [恢复] [删除]                  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

挂载方式与现有 Modal 一致：在 `App.tsx` 通过 `modalType === 'recycleBin'` 渲染。

#### 3.2.2 空状态

当回收站为空时显示：
- 图标：`delete_outline`
- 文本：`{t.recycle.empty}`

#### 3.2.3 状态管理决策

**采用 Modal 内部 state，不新建 recycleStore**：
- 列表数据仅回收站视图使用，无跨组件共享需求
- 通过 `useEffect` 在 Modal 挂载时调用 `loadDeletedPrompts`，操作完成后本地刷新
- 恢复成功后通过 `usePromptLoader` 的 reload（见 3.3.3）触发主列表刷新

> 若后续需要"恢复后跳转/高亮"，再评估是否抽 store。

### 3.3 核心功能

#### 3.3.1 加载回收站列表

创建 `src/services/recycleService.ts`：

```typescript
export async function loadDeletedPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<DeletedPrompt[]> {
  // 1. 扫描整个 workspace，包含隐藏目录
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
    { includeHiddenDirectories: true }
  );

  // 2. filter：仅保留 _promptclip/.trash/ 下的 .md
  const trashPrefix = `${CONFIG.FILE_SYSTEM.TRASH_DIR}/`;
  const trashEntries = entries.filter((e) => e.path.startsWith(trashPrefix));

  // 3. 并发解析（限制并发 ≤ 20，参考 promptService.mapWithConcurrency）
  //    - 从 entry.name 提取 trashBase = filenameWithoutExtension
  //    - 从 trashBase 提取 timestamp（最后一段 '.' 后的 YYYY-MM-DD-HHMMSS）
  //    - parseFrontmatterOnly 拿 title（fallback 到 basename）
  //    - 探测批注 JSON 是否存在 → hasAnnotations
  //    - bodyHead 截前 N 字 → preview

  // 4. 按 deletedAt 倒序返回
}
```

**trashBase 解析规则**（必须显式说明）：

```
trashBase = `${base}.${YYYY-MM-DD-HHMMSS}`
                     └─────────┬─────────┘
                        timestamp（删除时间）
       ┌─────┴─────┐
       base（可能是 stableId 或 basename，恢复时不依赖它做映射）
```

时间戳正则：`/\.\d{4}-\d{2}-\d{2}-\d{6}$/`，匹配失败视为损坏数据跳过。

**类型定义**（`src/types/prompt.ts`）：

```typescript
export interface DeletedPrompt {
  /** 回收站内文件名基础（不含扩展名），如 "abc123.2025-01-15-103045" */
  trashBase: string;
  /** 在回收站中的完整路径，如 "_promptclip/.trash/abc123.2025-01-15-103045.md" */
  filePath: string;
  /** frontmatter title；缺失时回退到 basename */
  title: string;
  /** 预览文本（前 ~200 字） */
  preview: string;
  /** 删除时间，从 trashBase 尾部 timestamp 解析 */
  deletedAt: Date;
  /** 是否有关联批注 JSON 存在 */
  hasAnnotations: boolean;
}
```

> **注意**：**不再保留 `id` 字段**。原因：trashBase 的 base 可能是 legacy basename，无法保证是 stableId；恢复时也不应依赖它做路径映射（见 3.3.3）。

#### 3.3.2 查看详情（只读）

采用 **RecycleDetailDrawer** 方案（在 RecycleModal 内部实现，与主列表解耦），不污染主 DetailPanel：

- 新建 `src/components/recycle/RecycleDetailDrawer.tsx`
- 通过 `repository.readText(workspace, deleted.filePath)` 直接读取 trash 文件
- 复用 `parseMarkdown` 拿 content、metadata
- 复用 `useAnnotationStore` / `AnnotationService.loadAnnotations` 时，临时把 `trashBase` 当 promptId 从 `.trash/annotations/${trashBase}.json` 读
- **只读**：不渲染编辑按钮、不触发任何写操作

> 不在主 DetailPanel 加 `readOnly` 旁路 —— 主面板依赖 `selectedPromptId` 从 promptStore 取数，trash 文件不在主列表中，强行接入会污染状态。

#### 3.3.3 恢复 Prompt

**核心约束**：恢复后的 md 会被 `loadPrompts` 重新分配 stableId（见 `assignEffectiveStableIds`），因此批注/附件的目标 id 必须用"恢复后的新 stableId"，不能用 trashBase 的 base。

**实现**（`src/services/recycleService.ts`）：

```typescript
export async function restorePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt
): Promise<Prompt> {
  // 1. 生成目标文件名（含冲突处理，见下方 generateTargetFilename）
  const targetFilename = await generateTargetFilename(repository, workspace, deleted);

  // 2. move .md 文件
  await repository.move(workspace, deleted.filePath, targetFilename);

  // 3. 加载恢复后的文件，触发 stableId 分配
  //    - 读取 frontmatter，若 metadata.id 不是 stableId，写入新 stableId
  //    - 返回新 Prompt 对象（含新的 prompt.id）
  const restored = await ensureStableIdAndLoad(repository, workspace, targetFilename);

  // 4. 用新的 stableId move 批注和附件
  //    若步骤 3 与 4 之间失败：批注/附件仍留在 trash，可重试恢复
  await restoreAnnotations(repository, workspace, deleted, restored.id);
  await restoreAnnotationAssets(repository, workspace, deleted, restored.id);

  return restored;
}

/** 复用 filenameFromTitle + validatePromptTitle，冲突时追加 i18n 后缀 */
async function generateTargetFilename(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt
): Promise<string> {
  const baseTitle = deleted.title || trashBaseToBasename(deleted.trashBase);

  for (let counter = 0; ; counter++) {
    const candidate = counter === 0
      ? baseTitle
      : `${baseTitle}${getRestoreSuffix(locale, counter)}`; // 如 "标题-恢复1"
    const filename = filenameFromTitle(candidate);

    try {
      // 复用现有校验：合法性 + 冲突
      await validatePromptTitle(repository, workspace, candidate);
      return filename;
    } catch (error) {
      // 仅"标题已存在"才继续尝试，其他错误（非法字符等）直接抛出
      if (!isTitleConflictError(error) || counter >= 99) {
        throw error;
      }
    }
  }
}

async function ensureStableIdAndLoad(...): Promise<Prompt> {
  // 读取 → 解析 → 若 metadata.id 非 stableId 则生成新 stableId 并写回 → 返回 Prompt
  // 复用 promptService 中已有的写入逻辑
}

async function restoreAnnotations(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt,
  newPromptId: string              // ← 用恢复后的新 id，不用 trashBase
): Promise<void> {
  const trashAnnotationPath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR, 'annotations', `${deleted.trashBase}.json`
  );

  if (await repository.exists(workspace, trashAnnotationPath)) {
    await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR);
    await repository.move(
      workspace,
      trashAnnotationPath,
      joinPath(CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR, `${newPromptId}.json`)
    );
  }
}

async function restoreAnnotationAssets(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt,
  newPromptId: string              // ← 同上
): Promise<void> {
  const trashAssetPath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR, 'assets', deleted.trashBase
  );

  if (await repository.exists(workspace, trashAssetPath)) {
    await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR);
    await repository.move(
      workspace,
      trashAssetPath,
      joinPath(CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR, newPromptId)
    );
  }
}
```

**部分失败处理策略**（满足风险 10.1）：

| 阶段失败 | 状态 | 处理 |
|---|---|---|
| 步骤 2（move md）失败 | 原状未变 | 抛出错误，提示用户重试 |
| 步骤 3（写 stableId）失败 | md 已 move 到目标，stableId 未写 | `loadPrompts` 仍会分配临时 legacy id，**功能上可用**；记日志，提示"批注可能未关联"，让用户重试一次恢复（会再次走完整流程，批注会被正确关联） |
| 步骤 4（批注/附件）失败 | md 已恢复，批注/附件仍在 trash | 提示"Prompt 已恢复，批注恢复失败"；trash 中残留的批注不会污染主列表 |

调用方在 React 层 try/catch + Toast 提示，**不做自动回滚**（回滚成本 > 残留成本）。

**恢复后刷新主列表**：

```typescript
// RecycleModal 内
try {
  await restorePrompt(repository, workspace, deleted);
  addToast({ type: 'success', message: t.recycle.restored, duration: 3000 });
  await reloadMainList();   // 触发 usePromptLoader 的 load 流程或调 PromptService.loadPrompts
  await refreshRecycleList(); // 本地刷新回收站列表
} catch (error) {
  addToast({ type: 'error', message: ..., duration: 5000 });
}
```

`reloadMainList` 复用 `usePromptLoader` 的 load 函数（可抽到 hook 或 store action）。

#### 3.3.4 永久删除

**单个删除**：

```typescript
export async function permanentDelete(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt
): Promise<void> {
  // 1. 删除 .md 文件
  await repository.remove(workspace, deleted.filePath);

  // 2. 删除批注 JSON（若存在）
  const annotationPath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR, 'annotations', `${deleted.trashBase}.json`
  );
  await removeIfExists(repository, workspace, annotationPath);

  // 3. 删除附件目录（递归）—— repository.remove 内部已用 { recursive: true }
  const assetPath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR, 'assets', deleted.trashBase
  );
  await removeIfExists(repository, workspace, assetPath);
}
```

**全部清空（串行执行，避免 File System Access API 并发竞争）**：

```typescript
export async function emptyRecycleBin(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<void> {
  const deleted = await loadDeletedPrompts(repository, workspace);

  const failures: Error[] = [];
  for (const item of deleted) {
    try {
      await permanentDelete(repository, workspace, item);
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
      console.error('Failed to permanently delete:', item.trashBase, error);
    }
  }

  if (failures.length > 0) {
    throw new Error(`部分文件删除失败（${failures.length}/${deleted.length}）`);
  }
}
```

> **不用 `Promise.all`**：File System Access API 在同一目录下的并发 move/remove 可能触发 permission/lock 问题；串行 await 是最稳的策略。错误聚合后一次性抛出，让 UI 显示"部分失败"。

---

## 4. 项目结构

### 4.1 新增文件

```
src/
├── components/
│   └── recycle/
│       ├── RecycleModal.tsx           # 回收站主 Modal
│       ├── RecycleCard.tsx            # 单个删除项卡片
│       ├── RecycleDetailDrawer.tsx    # 只读详情抽屉
│       └── index.ts
├── services/
│   └── recycleService.ts              # 回收站业务逻辑
└── types/
    └── prompt.ts                       # 新增 DeletedPrompt 类型
```

### 4.2 修改文件

```
src/
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx                # 添加回收站入口（标签树与底部存储区之间）
│   └── command/
│       └── CommandPalette.tsx         # 添加 'open-recycle-bin' 命令
├── App.tsx                            # 渲染 {modalType === 'recycleBin' && <RecycleModal />}
├── types/
│   └── ui.ts                          # ModalType 新增 'recycleBin'
├── i18n/
│   └── messages.ts                    # 新增 recycle 命名空间（4 语言）
└── components/
    └── index.ts                       # 导出新组件
```

> **ModalType 命名风格**：用 camelCase `'recycleBin'`，与现有 `'create' | 'edit' | 'settings'` 保持一致，**不要**用 kebab-case `'recycle-bin'`。

---

## 5. 代码风格

### 5.1 TypeScript

- 严格模式，所有函数有明确的参数和返回类型
- 使用 `as const` 冻结服务导出对象
- 使用可选链 `?.` 和空值合并 `??` 处理可能为空的情况

### 5.2 组件规范

- 函数式组件，使用命名导出
- Props 接口定义在组件文件内，单独 `export type`
- 状态通过 Zustand hooks 管理，不使用 React Context
- 使用 Tailwind CSS utility classes

### 5.3 服务层

- 无状态模块，导出独立函数
- 使用 `FileRepository` 接口进行文件操作
- 错误处理：捕获并记录，向上抛出业务错误
- 使用 `joinPath` 构建路径，不使用字符串拼接

### 5.4 i18n

项目实际支持 **4 种语言**：`zh-CN` / `zh-TW` / `en-US` / `ja-JP`。所有新增文案必须为四种语言同步添加。

**recycle 命名空间完整键清单**：

| 键 | 用途 | 示例（zh-CN） |
|---|---|---|
| `recycle.title` | Modal 标题 / 侧边栏入口 | `回收站` |
| `recycle.commandOpen` | 命令面板命令 | `打开回收站` |
| `recycle.empty` | 空状态文本 | `回收站为空` |
| `recycle.emptyAll` | 全部清空按钮 | `全部清空` |
| `recycle.view` | 查看按钮 | `查看` |
| `recycle.restore` | 恢复按钮 | `恢复` |
| `recycle.permanentDelete` | 永久删除按钮 | `永久删除` |
| `recycle.confirmRestore` | 恢复确认 | `确定恢复 "${title}" 吗？` |
| `recycle.confirmPermanentDelete` | 删除确认 | `确定永久删除 "${title}" 吗？此操作不可撤销。` |
| `recycle.confirmEmptyAll` | 清空确认 | `确定清空回收站吗？所有文件将被永久删除。` |
| `recycle.restored` | 恢复成功 Toast | `已恢复 "${title}"` |
| `recycle.permanentlyDeleted` | 删除成功 Toast | `已永久删除` |
| `recycle.allCleared` | 清空成功 Toast | `回收站已清空` |
| `recycle.restoreSuffix` | 文件名冲突后缀 | (n=1) `-恢复1` |
| `recycle.partialFailure` | 部分失败 | `部分操作失败，请重试` |
| `recycle.deletedAt` | 删除时间标签 | `删除于 ${date}` |

**`restoreSuffix` 必须是函数**，签名：`(counter: number) => string`，四种语言示例：

```typescript
// zh-CN
restoreSuffix: (n) => `-恢复${n}`,
// zh-TW
restoreSuffix: (n) => `-復原${n}`,
// en-US
restoreSuffix: (n) => `-restored-${n}`,
// ja-JP
restoreSuffix: (n) => `-復元${n}`,
```

---

## 6. 测试策略

### 6.1 单元测试

**recycleService.test.ts**：
- `loadDeletedPrompts`：
  - 正确解析 stableId 形 trashBase（`abc123.2025-01-15-103045`）
  - 正确解析 legacy 形 trashBase（`我的标题.2025-01-15-103045`）
  - 跳过时间戳格式损坏的文件
  - 正确探测 hasAnnotations（批注 JSON 存在/不存在）
  - 按 deletedAt 倒序
- `restorePrompt`：
  - **核心场景**：legacy trashBase 恢复后，批注 JSON 移到 `annotations/${newStableId}.json`（不是 trashBase）
  - 文件名冲突时正确追加后缀（n=0 不加，n=1 加 `-恢复1`）
  - 部分失败：md 已 move 但批注缺失 → 不抛错
  - stableId 写回：恢复的 md 在重新 load 后 metadata.id 为合法 stableId
- `permanentDelete`：正确删除 md / 批注 JSON / 附件目录（递归）
- `emptyRecycleBin`：
  - 全部成功
  - 部分失败 → 抛聚合错误，未失败项已删除

### 6.2 集成测试

**RecycleModal.test.tsx**：
- 渲染：正确显示列表 / 空状态
- 交互：点击恢复 → 调用 `restorePrompt` → 触发 `loadPrompts` 重载
- 交互：点击删除 → 显示确认对话框
- 交互：全部清空 → 显示二次确认

**RecycleDetailDrawer.test.tsx**：
- 渲染：从 trash 路径读取并显示
- 只读：不触发任何写操作

### 6.3 E2E 测试场景

1. 删除一个有批注的 Prompt → 验证在回收站可见
2. 恢复 stableId 形 Prompt → 验证文件、批注、附件都恢复到新 stableId 路径
3. **恢复 legacy 形 Prompt（重点）** → 验证 md 获得新 stableId，批注关联到新 stableId（**这是 P0-1 修订的核心回归点**）
4. 恢复同名 Prompt → 验证自动追加 `-恢复1` 后缀
5. 永久删除 → 验证所有文件被删除（含附件目录）
6. 全部清空 → 验证回收站为空

---

## 7. 边界与约束

### 7.1 必须实现

- ✅ 侧边栏入口（位置：标签树与底部存储区之间，仅展开时显示）
- ✅ 命令面板入口
- ✅ 查看被删除的 Prompt 列表
- ✅ 查看单个 Prompt 详情（只读抽屉，不污染主 DetailPanel）
- ✅ 恢复单个 Prompt（含批注、附件），**正确处理 stableId 重分配**
- ✅ 永久删除单个 Prompt（含批注、附件）
- ✅ 全部清空（**串行执行 + 部分失败聚合**）
- ✅ 文件名冲突时追加 i18n 化后缀（zh-CN: `-恢复1`，en-US: `-restored-1`，等）

### 7.2 明确不实现

- ❌ 回收站自动清理（如30天后自动删除）
- ❌ 回收站存储空间限制
- ❌ 恢复到用户指定位置（只能恢复到原始位置）
- ❌ 恢复历史版本（历史版本是独立功能）
- ❌ 批量恢复（本次仅实现单个恢复）
- ❌ 回收站搜索/筛选（本次仅实现列表显示）

### 7.3 待确认（本次不实现）

- ⏸️ 批量选择和批量恢复
- ⏸️ 回收站排序（按删除时间、标题等）
- ⏸️ 回收站存储配额显示

---

## 8. 实现计划

### 阶段 1：基础服务层
- [ ] 创建 `recycleService.ts`
- [ ] 实现 `loadDeletedPrompts`（trash 目录扫描 + trashBase 解析）
- [ ] 实现 `restorePrompt`（**重点：stableId 重分配后再 move 批注**）
- [ ] 实现 `generateTargetFilename`（复用 `filenameFromTitle` + `validatePromptTitle`）
- [ ] 实现 `permanentDelete`
- [ ] 实现 `emptyRecycleBin`（**串行**）
- [ ] 添加 `DeletedPrompt` 类型定义（**不含 id 字段**）
- [ ] 编写服务层单元测试（**含 legacy trashBase 恢复回归**）

### 阶段 2：UI 组件
- [ ] 创建 `RecycleModal.tsx`
- [ ] 创建 `RecycleCard.tsx`
- [ ] 创建 `RecycleDetailDrawer.tsx`（只读）
- [ ] 实现列表渲染和空状态
- [ ] 实现查看详情功能
- [ ] 编写组件测试

### 阶段 3：集成
- [ ] 修改 `Sidebar.tsx` 添加入口
- [ ] 修改 `CommandPalette.tsx` 添加命令
- [ ] 修改 `App.tsx` 渲染 `RecycleModal`
- [ ] 更新 `ui.ts` modal 类型（`'recycleBin'`）
- [ ] 添加 i18n 翻译（**4 语言全量**）
- [ ] **恢复成功后调用主列表 reload**（复用 `usePromptLoader` 的 load 流程）
- [ ] 更新 barrel 文件

### 阶段 4：测试与验证
- [ ] 手动测试完整流程
- [ ] **重点验证 legacy trashBase 恢复后批注关联正确**
- [ ] 验证批注和附件恢复
- [ ] 验证文件名冲突处理（4 语言后缀）
- [ ] 验证部分失败时的 UI 反馈
- [ ] 修复发现的 bug

---

## 9. 验收标准

### 功能验收

1. 用户能够通过侧边栏进入回收站
2. 用户能够通过命令面板（Cmd+K）进入回收站
3. 回收站显示所有被删除的 Prompts，包括标题、删除时间、预览
4. 用户能够查看被删除 Prompt 的完整内容和批注（只读）
5. 用户能够恢复单个 Prompt，恢复后包括：
   - Prompt 内容（md 文件）
   - 批注文本（JSON）
   - 批注附件（assets 目录）
6. **恢复 legacy（无 stableId）Prompt 时，批注 JSON 自动关联到恢复后新生成的 stableId**
7. 恢复时如果文件名冲突，自动追加 i18n 化后缀（如中文 `-恢复1`、英文 `-restored-1`）
8. 恢复成功后主列表立即显示新恢复的 Prompt
9. 用户能够永久删除单个 Prompt（含关联文件，含附件目录递归删除）
10. 用户能够清空整个回收站（串行执行，部分失败时给出明确提示）
11. 回收站为空时显示友好的空状态提示

### UI/UX 验收

1. 回收站入口在侧边栏位置正确（标签树与底部存储区之间，折叠时不显示）
2. 命令面板中"打开回收站"命令显示正确
3. Modal 样式与现有 Modal 一致
4. 操作按钮布局合理，有明确的图标和文字
5. 删除/清空操作有确认对话框，永久删除操作有二次确认
6. 加载状态有适当的提示
7. 操作成功后有 Toast 提示
8. 部分失败时 Toast 明确说明失败数量

### 技术验收

1. 所有代码通过 TypeScript 类型检查
2. 所有代码通过 ESLint 检查
3. 服务层有单元测试覆盖，**包含 legacy trashBase 恢复的回归测试**
4. 组件有基础测试覆盖
5. 不引入新的控制台错误或警告
6. **恢复流程不依赖 trashBase 反推 stableId**

---

## 10. 风险与注意事项

### 10.1 技术风险

1. **stableId 重新分配**（已缓解）
   - 风险：legacy 文件恢复后 stableId 变化，导致批注关联丢失
   - 缓解：恢复流程改为"先 move md → 写 stableId → 取新 id → move 批注"，详见 3.3.3

2. **文件操作部分失败**（已设计）
   - 风险：恢复中途失败留下半恢复状态
   - 缓解：按阶段分级处理（见 3.3.3 部分失败策略），不自动回滚，让用户可重试

3. **并发删除竞态**（已缓解）
   - 风险：`emptyRecycleBin` 并发触发 File System Access API 锁
   - 缓解：强制串行 `for...of` + 错误聚合

4. **批注文件格式变化**
   - 风险：批注 JSON 格式可能在将来变化
   - 缓解：使用版本号检查，兼容处理（沿用 `AnnotationService` 既有逻辑）

5. **大文件处理**
   - 风险：批注附件可能较大
   - 缓解：使用异步操作，提供加载状态

### 10.2 UX 风险

1. **误操作风险**：用户可能误点"全部清空"
   - 缓解：添加二次确认对话框

2. **恢复后找不到**：恢复后用户可能找不到文件
   - 缓解：恢复后自动刷新主列表；可选后续优化"恢复后定位滚动"

3. **空状态困惑**：用户可能不知道为什么回收站是空的
   - 缓解：提供清晰的空状态说明

4. **批注"消失"错觉**（已缓解）
   - 风险：legacy 文件恢复后用户感觉批注没了
   - 缓解：P0-1 修订保证了批注关联到新 stableId，并通过 E2E 场景 3 作为回归测试

---

**文档版本**：1.1
**创建日期**：2025-06-17
**最后更新**：2026-06-17
