# Spec: Prompt 稳定 ID 与历史版本关联

## 1. 背景与问题

当前 prompt 的 `id` 直接从文件路径派生（`idFromFilename`），历史版本文件名使用这个 id 作为前缀：

```
prompt 文件:  "我的笔记.md"        → id = "我的笔记"
历史文件:     ".history/我的笔记.2026-05-17-143052.md"
```

**核心缺陷**：修改标题时文件会被 rename，prompt.id 随之改变，但 `.history/` 下的旧历史文件名不会同步更新，导致历史关联断裂。

此外，为区分含 `.` 的 id（如 `foo.bar`），引入了 `encodeHistoryPromptId` 编码机制，增加了不必要的复杂度。

## 2. 目标

引入一个**不可变、与文件名无关的稳定 ID**，存储在 frontmatter 中，用于历史版本关联。文件名仅作为"显示名"，可自由修改。

## 3. 设计方案

### 3.1 frontmatter 新增 `id` 字段

```yaml
---
id: "17474772001234567"
title: "我的笔记"
tags: ["工作", "AI"]
created: "2026-05-17T14:30:00.000Z"
modified: "2026-05-17T14:30:00.000Z"
copy_count: 0
pinned: false
---

正文内容...
```

- **生成规则**：`Date.now()`（13 位毫秒时间戳）+ 4 位随机数，共 17 位纯数字
- **格式**：`{timestamp}{random4}`，例如 `"17474772001234567"`
- **存储语义**：始终作为字符串存储和解析，frontmatter 必须加引号，避免 17 位数字超过
  JavaScript 安全整数范围后发生精度丢失
- **不可变性**：一旦生成，永不改变，不随标题/文件名修改而变化
- **唯一性保证**：生成时必须在当前工作区已知 ID 集合中查重；如果碰撞则重新生成
- **优势**：纯数字可读性好，且天然按时间有序；无额外依赖

### 3.2 prompt.id 语义变更

| | 变更前 | 变更后 |
|---|---|---|
| 来源 | 从文件路径派生 `idFromFilename(entry.path)` | 从 frontmatter `id` 字段读取 |
| 唯一性 | 依赖文件路径唯一 | 时间戳+随机数 + 工作区内查重 |
| 稳定性 | 随 rename 改变 | 永不改变 |
| 格式示例 | `folder/我的笔记` | `17474772001234567` |

### 3.3 历史文件命名简化

```
.history/<stableId>.YYYY-MM-DD-HHMMSS.md
```

- 不再需要 `encodeHistoryPromptId`（纯数字无特殊字符，无需编码）
- `isHistoryEntryForPrompt` 简化为严格正则匹配

### 3.4 受影响的操作

| 操作 | 变更点 |
|---|---|
| `loadPrompts` | 扫描文件、分配缺失 ID、处理重复 ID、回写迁移结果 |
| `loadPrompt` | id 从 frontmatter 读取；无 id 时由调用方传入新 stableId |
| `createPrompt` | 生成工作区内唯一的 stableId，写入 frontmatter |
| `updatePrompt` | rename 时不影响 id；无需重命名历史文件 |
| `createHistoryVersion` | 使用 prompt.id（stableId）作为历史文件名前缀 |
| `deletePrompt` | 回收站命名可保留时间戳后缀（改用 stableId） |
| `validatePromptTitle` | 重名检测基于当前文件路径而非 prompt.id |
| `exportMDArchive` | 导出文件名继续使用标题/原文件名，frontmatter 保留 stableId |

## 4. 详细设计

### 4.1 类型变更

**`src/types/prompt.ts`**

```typescript
// PromptMetadata 新增 id 字段
export interface PromptMetadata {
  id?: string;       // 新增：稳定 ID
  title?: string;
  tags?: string[];
  // ...其余不变
}
```

### 4.2 工具函数

**`src/utils/id.ts`** — 新增 `generateStableId`

```typescript
/**
 * 生成纯数字稳定 ID
 * 格式：13 位毫秒时间戳 + 4 位随机数，共 17 位
 */
export function generateStableId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${random}`;
}
```

- 零依赖，使用 `Date.now()` + `Math.random()`
- 只负责生成候选 ID，不负责保证唯一
- 新增 `isStableId(value: unknown): value is string` 校验：必须是 17 位数字字符串
- 不使用已有的 `generateShortId`（那个只有 6 字符，碰撞概率高）

### 4.3 解析与序列化

**`src/utils/markdown.ts`**

- `parseMarkdown`：解析结果中包含 `metadata.id`
- `serializeMarkdown`：当 `metadata.id` 存在时输出 `id: "xxx"` 到 frontmatter
- `parseMarkdown` 遇到未加引号的历史数字 id 时，使用 `String(data.id)` 兼容读取；但新写入内容
  一律写成加引号字符串

**序列化顺序约定**：`id` 字段放在 frontmatter 第一个位置，便于人类快速定位：

```yaml
---
id: "17474772001234567"
title: "..."
---
```

> 注意：虽然 `id` 只包含数字字符，但它是字符串标识符，不是数值。

### 4.4 服务层变更

**`src/services/promptService.ts`**

#### `loadPrompts`

```
1. 列出所有 Markdown 文件
2. 逐个读取并解析 frontmatter
3. 按 stableId 分组，并维护 seenStableIds 集合
4. 对每个文件决定 effectiveStableId：
   a. metadata.id 缺失或格式非法：生成未出现在 seenStableIds 中的新 stableId
   b. metadata.id 已被其他文件使用：按重复 ID 冲突策略选出一个保留原 ID，其余文件生成新 ID
   c. metadata.id 合法且未重复：直接使用
5. 对需要迁移的文件回写 frontmatter
6. 返回 prompt.id = effectiveStableId
```

这样可以同时处理旧文件迁移、用户手动复制 `.md` 文件导致的重复 ID，以及手动编辑 frontmatter
删除/破坏 `id` 的情况。

#### 重复 ID 冲突策略

重复 ID 通常来自用户手动复制 Markdown 文件。不能用“后加载文件”判断谁应该换 ID，因为文件扫描
顺序不代表创建顺序；当前 `FileRepository` 也没有暴露可靠的创建时间，且不同文件系统/浏览器对复制
文件的时间戳保留行为并不一致。

对同一个 stableId 下的多个文件，使用确定性规则选出 canonical 文件保留原 ID，其余文件重新生成 ID：

1. 优先保留文件名 basename 与 frontmatter `title` 完全一致的文件
2. 如果仍有多个候选，保留 `modifiedAt` 最早的文件
3. 如果仍无法区分，按 `filePath` 字典序保留第一个

这个策略不声称一定识别“原文件”，但结果稳定、可测试，并且符合最常见的手动复制场景：复制件通常会
有不同文件名或更晚的修改时间。

#### `loadPrompt`

```
1. 读取文件内容
2. 解析 frontmatter 和正文
3. 使用调用方传入的 effectiveStableId 构建 Prompt
4. 不再自行从文件路径派生 prompt.id
```

回写逻辑由 `loadPrompts` 统一触发：
- 读取原始文件内容
- 用 `serializeMarkdown` 构建含 `id` 字段的新 frontmatter
- 写回文件
- 仅在首次加载时执行一次，不影响性能

#### `createPrompt`

```
1. 收集当前工作区已有 stableId
2. generateStableId() → stableId
3. 如果 stableId 已存在，重新生成，直到唯一
4. metadata.id = stableId
5. 其余逻辑不变，但 prompt.id = stableId
```

#### `updatePrompt`

```
1. 创建历史版本（使用 prompt.id = stableId）
2. 如果标题变更，rename 文件
3. prompt.id 不变（仍为 stableId）
4. 回写 frontmatter 时保留 id 字段
```

**关键变化**：`updatePrompt` 返回值的 `id` 字段始终不变，不再依赖 `idFromFilename(nextFilename)`。

`validatePromptTitle` 不能继续接收 `currentPromptId` 后再调用 `filenameFromId(currentPromptId)`，
因为 stableId 不是文件名。签名调整为：

```typescript
export async function validatePromptTitle(
  repository: FileRepository,
  workspace: WorkspaceRef,
  title: string,
  currentFilePath?: string
): Promise<void>
```

重名检测基于 `currentFilePath` 和目标标题生成的同目录文件路径。

#### `deletePrompt`

```
回收站文件名改为：<stableId>.<timestamp>.md
```

#### `createHistoryVersion`

```
历史文件名：<stableId>.<timestamp>.md
删除 encodeHistoryPromptId 函数（纯数字无特殊字符，无需编码）
```

#### `isHistoryEntryForPrompt`

简化匹配逻辑。stableId 只包含数字，不需要 URI 编码；仍保留日期格式约束，避免误匹配：

```typescript
function isHistoryEntryForPrompt(entry: FileEntry, stableId: string): boolean {
  if (!entry.path.startsWith(HISTORY_PATH_PREFIX)) return false;
  return new RegExp(`^${stableId}\\.\\d{4}-\\d{2}-\\d{2}-\\d{6}\\.md$`).test(entry.name);
}
```

### 4.5 默认模板

**`src/constants/defaults.ts`**

```typescript
export const DEFAULT_PROMPT_TEMPLATE = `---
id: "{{ID}}"
title: "新 Prompt"
tags: []
created: "{{DATE}}"
modified: "{{DATE}}"
copy_count: 0
pinned: false
---

# Prompt 标题

在此输入 Prompt 内容...
`;
```

### 4.6 Store 层

无变更。`promptStore` 已使用 `prompt.id` 作为 Map key，stableId 替换后行为不变。

### 4.7 UI 层

无变更。组件通过 `prompt.id` 引用笔记，stableId 替换后行为不变。

### 4.8 导出层

**`src/services/exportService.ts`**

Markdown zip 导出不再使用 `filenameFromId(prompt.id)` 作为导出文件名，否则用户会得到不可读的数字
文件名。导出策略：

1. 优先使用 `prompt.filePath` 的 basename
2. 如果没有 `filePath`，使用 `filenameFromTitle(prompt.title)`
3. 如果导出包内文件名冲突，追加 `-2`、`-3` 等后缀
4. 导出文件的 frontmatter 仍包含 `id: "<stableId>"`

## 5. 旧文件迁移策略

### 5.1 检测条件

`loadPrompts` 解析 frontmatter 后，满足任一条件时触发迁移：

- `metadata.id` 缺失
- `metadata.id` 不是 17 位数字字符串
- `metadata.id` 与本次扫描中已加载的其他 prompt 重复

### 5.2 迁移步骤

1. 生成工作区内唯一的 `stableId`
2. 构建含 `id` 字段的新 frontmatter
3. 写回文件
4. 返回的 `prompt.id` 使用 `stableId`

当前 `FileRepository` 没有原子替换接口，因此实现层只做普通写回；如果写回失败，不应静默吞掉。

### 5.3 迁移失败策略

如果迁移写回失败：

- `loadPrompts` 捕获异常并记录明确错误日志，包含文件路径
- 该文件本次加载使用 legacy 路径 ID（`idFromFilename(entry.path)`）作为临时 ID，避免丢失展示
- 不把这个临时 ID 写入 frontmatter，也不把它用于新历史文件命名的长期保证
- 下次加载仍会再次尝试迁移

这样可以避免阻塞整个目录加载，同时明确这个文件仍处于未迁移状态。

### 5.4 历史文件迁移

**不迁移旧历史文件**。原因：

- 旧历史文件名含文件路径前缀，无法可靠反推其对应的 stableId
- 旧历史文件本身就是完整快照，不依赖应用也能直接阅读
- 迁移成本高、风险大，收益低

旧历史文件将保留在 `.history/` 中但不再被新版本的 `getHistoryVersions` 查询到。它们会自然地通过 `cleanupOldHistoryVersions` 或手动清理被移除。

## 6. 依赖引入

**无新增依赖**。使用 `Date.now()` + `Math.random()` 生成，零依赖。

## 7. 删除的代码

| 函数/常量 | 位置 | 原因 |
|---|---|---|
| `encodeHistoryPromptId` | `promptService.ts` | 纯数字无特殊字符，无需编码 |
| `HISTORY_FILENAME_TEMPLATE` | `defaults.ts` | 已未使用，清理 |
| `idFromFilename` 中用于 prompt.id 的调用 | `promptService.ts` | prompt.id 改从 frontmatter 读取 |

> 注意：`idFromFilename`、`filenameFromId` 保留用于文件路径辅助逻辑或 legacy 临时 ID，但不再作为
> prompt identity 的正常来源。

## 8. 测试计划

### 8.1 单元测试

| 测试场景 | 验证点 |
|---|---|
| 创建 prompt | frontmatter 包含加引号的 17 位数字字符串 `id` 字段 |
| 加载已有 prompt（含 id） | prompt.id 等于 frontmatter 中的 id |
| 加载旧 prompt（无 id） | 自动生成 id 并回写文件 |
| 加载 id 为未加引号数字的文件 | 兼容读取，重新序列化后写为字符串 |
| 加载重复 id 的复制文件 | canonical 文件保留原 id，其余文件获得新 id，避免 store key 覆盖 |
| 加载格式非法 id 的文件 | 自动生成合法 id 并回写 |
| 修改标题（rename） | prompt.id 不变，历史文件仍可匹配 |
| 修改标题重名检测 | 基于当前 filePath，同目录 rename 不误判 |
| 创建历史版本 | 文件名前缀为 stableId |
| 查询历史版本 | 能正确匹配 stableId 前缀的历史文件 |
| 删除 prompt | 回收站文件名使用 stableId |
| 导出 Markdown zip | 文件名可读且 frontmatter 保留 stableId |
| stableId 格式 | 17 位数字字符串（13 位时间戳 + 4 位随机数） |

### 8.2 回归测试

确保现有测试用例全部通过（更新测试数据以包含 `id` 字段）。

## 9. 风险与约束

| 风险 | 缓解措施 |
|---|---|
| 旧历史文件断裂 | 保留旧文件不删除，仅不再关联；见 §5.4 |
| 碰撞风险 | 生成时基于当前工作区已知 ID 集合查重，碰撞则重试 |
| 17 位数字精度丢失 | frontmatter 加引号，解析和序列化都按字符串处理 |
| 用户复制 Markdown 文件导致重复 ID | `loadPrompts` 用确定性 canonical 规则保留一个原 ID，其余文件重新生成 ID |
| 迁移写回失败 | 记录错误，临时使用 legacy 路径 ID，不阻塞加载，下次继续迁移 |
| 用户手动编辑 frontmatter 删除 id | `loadPrompts` 检测到无 id 时重新生成 |
