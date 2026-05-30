# SPEC: iOS 历史笔记管理功能

## 目标

在 PromptClip iOS 端实现与 Web 端一致的历史笔记管理能力。用户启用历史版本后，编辑笔记会自动把编辑前的当前版本保存到工作区 `.history/` 目录；用户可以在笔记详情页查看历史版本、复制历史正文，并将某个历史版本恢复为当前笔记。

该规格基于 Web 端 `docs/历史笔记管理-SPEC.md` 和当前代码实现整理。iOS 端应优先保持文件格式、数据语义、设置行为和恢复规则一致，便于同一个本地工作区在 Web、桌面和 iOS 之间复用。

## 用户故事

- 作为用户，我可以在设置中启用或关闭历史版本。
- 作为用户，我可以在笔记详情页打开当前笔记的历史版本列表。
- 作为用户，我可以选择某个历史版本并查看其标题、编辑时间、标签、字符数和正文。
- 作为用户，我可以复制历史版本的 Markdown 正文。
- 作为用户，我可以把历史版本恢复为当前笔记，并且恢复前的当前内容不会丢失。

## 范围

### 必须实现

- 工作区配置文件 `.promptclip.json` 中的历史版本设置读取和写入。
- 历史版本默认关闭，启用后才自动创建历史快照。
- 编辑笔记时，在写入新内容前为当前笔记创建历史版本。
- 复制次数和收藏状态切换不创建历史版本。
- 笔记详情页历史版本入口；历史版本关闭时不显示入口。
- 历史版本列表，按编辑时间倒序排列。
- 历史版本详情展示。
- 复制历史版本正文。
- 恢复历史版本为当前笔记。
- 恢复前必须先把当前笔记保存为新的历史版本。
- 历史版本最多保留 10 个，超过后删除最旧版本。
- 多语言文案至少覆盖简体中文、繁体中文、英文。

### 暂不实现

- 历史版本 diff 对比。
- 删除单个历史版本或清空历史版本。
- 历史版本搜索。
- 手动创建历史快照。
- 云端同步、后端版本库或数据库版本表。
- 按 `retentionDays` 自动清理历史版本。当前 Web 端只保存该设置，不按天数清理。

## 工作区配置

文件名：`.promptclip.json`

iOS 端需要兼容并维护以下字段，保存时不得丢弃其他已存在字段：

```json
{
  "historyVersions": {
    "enabled": false,
    "retentionDays": 30
  },
  "pinnedTags": [],
  "shareAuthorName": ""
}
```

字段规则：

- `historyVersions.enabled`
  - 类型：`Bool`
  - 默认值：`false`
  - 只有严格为 `true` 时才视为启用。
- `historyVersions.retentionDays`
  - 类型：正整数
  - 默认值：`30`
  - 读取到非整数、缺失或小于 1 时回退或规范化为至少 `1`。
  - 首版只保存设置，不参与自动清理。
- 配置读取失败、文件不存在、JSON 格式错误时回退默认配置。
- 历史版本设置是工作区级配置，不应只存入 `UserDefaults`，避免不同工作区串值。

## 笔记数据模型

历史版本复用普通 Markdown 笔记文件格式：

```markdown
---
id: "11111111111111111"
title: "标题"
tags: ["工作"]
created: "2026-05-16T00:00:00.000Z"
modified: "2026-05-17T01:00:00.000Z"
copy_count: 2
pinned: true
pinned_at: "2026-05-17T00:30:00.000Z"
---

正文内容
```

历史版本模型建议：

```swift
struct PromptHistoryVersion: Identifiable, Equatable {
    var id: String { filename }
    let filename: String
    let fileModifiedAt: Date
    let editedAt: Date
    let title: String
    let content: String
    let tags: [String]
    let createdAt: Date?
    let copyCount: Int
    let pinned: Bool
    let pinnedAt: Date?
}
```

字段语义：

- `filename` 是 `.history/` 下的文件名，不含目录。
- `fileModifiedAt` 对应文件系统修改时间，用于兼容和兜底。
- `editedAt` 优先使用 frontmatter `modified`，缺失时使用 `fileModifiedAt`。
- `content` 是去掉 YAML frontmatter 后的 Markdown 正文。
- `title` 优先使用 frontmatter `title`，缺失时从正文一级标题或文件名推断。
- `tags` 兼容 inline 数组和 block 数组。
- `copyCount` 缺失时为 `0`。
- `pinned` 缺失时为 `false`。

## 文件组织

历史目录：

```text
.history/
```

历史文件命名：

```text
.history/<stableId>.YYYY-MM-DD-HHMMSS.md
```

示例：

```text
.history/11111111111111111.2026-05-17-010000.md
```

规则：

- `<stableId>` 必须是当前笔记 frontmatter 中的稳定 ID。
- iOS 端必须只匹配精确格式：`^<stableId>\.\d{4}-\d{2}-\d{2}-\d{6}\.md$`。
- 不要匹配旧的路径型历史文件，例如 `.history/foo.2026-05-17-010000.md`。
- `.history/` 不参与主笔记列表扫描。
- 创建历史快照前确保 `.history/` 目录存在。
- 时间戳格式使用本地时间或当前平台现有文件时间格式即可，但文件名必须满足上述格式。

## 核心行为

### 加载历史版本列表

输入：当前工作区、当前笔记稳定 ID。

流程：

1. 如果笔记 ID 不是稳定 ID，返回空列表。
2. 扫描 `.history/` 下的 `.md` 文件。
3. 只保留文件名匹配当前稳定 ID 的历史文件。
4. 解析每个历史文件的 frontmatter 和正文。
5. 使用 `modified` 或文件修改时间计算 `editedAt`。
6. 按 `editedAt` 倒序返回。

错误处理：

- 单个历史文件读取或解析失败时，建议向 UI 返回错误，不要静默吞掉。
- `.history/` 目录不存在时返回空列表。

### 创建历史版本

触发时机：

- 普通编辑保存前触发。
- 恢复历史版本前触发。

不触发：

- 复制正文导致 `copy_count` 增加。
- 收藏、取消收藏导致 `pinned` 或 `pinned_at` 变化。
- 历史版本设置未启用。
- 当前笔记没有可持久化稳定 ID。

流程：

1. 读取 `.promptclip.json`。
2. 如果 `historyVersions.enabled != true`，直接返回。
3. 如果当前笔记 ID 不是稳定 ID，直接返回并记录诊断日志。
4. 创建 `.history/` 目录。
5. 读取当前笔记文件的原始 Markdown 内容。
6. 使用当前笔记 `updatedAt` 生成历史文件名。
7. 把原始 Markdown 内容原样写入 `.history/<stableId>.<timestamp>.md`。
8. 清理超过 10 个的旧历史版本。

保留上限：

- 常量：`MAX_HISTORY_VERSIONS = 10`
- 清理依据：历史文件的文件修改时间倒序保留前 10 个，删除剩余文件。
- `retentionDays` 首版不参与清理。

### 恢复历史版本

输入：当前笔记、目标历史文件名。

流程：

1. 校验当前笔记 ID 是稳定 ID。
2. 从当前笔记历史列表中查找目标文件名。
3. 读取并解析目标历史版本。
4. 先为当前笔记创建一个新的历史版本。
5. 使用历史版本内容更新当前笔记：
   - 保持当前笔记稳定 `id` 不变。
   - 恢复 `title`。
   - 恢复 Markdown 正文 `content`。
   - 恢复 `tags`。
   - 如历史版本存在 `created`，恢复 `createdAt`。
   - 恢复 `copy_count`。
   - 恢复 `pinned`。
   - 如历史版本存在 `pinned_at`，恢复 `pinnedAt`。
6. 写入当前笔记文件。
7. 如果恢复后的标题对应文件名变化，按现有笔记保存逻辑重命名当前笔记文件。
8. 更新内存中的笔记列表、详情页和搜索索引。
9. 恢复成功后关闭历史版本界面。

注意：

- 恢复写入当前笔记时不要再次创建历史版本，避免重复快照。
- 恢复失败时保留历史界面并展示错误。
- 如果目标历史文件不存在，提示“历史版本不存在”。

### 复制历史正文

复制内容：

- 只复制 Markdown 正文。
- 不复制 YAML frontmatter。

交互：

- 复制成功后显示短暂成功状态。
- 复制失败时展示错误，不关闭历史界面。

## iOS 界面规格

### 设置页

在通用设置中增加“历史版本”区域：

- 标题：`历史版本` / `歷史版本` / `History versions`
- 说明：默认关闭。启用后，后续版本会在编辑笔记时保留历史快照。
- 开关：启用历史版本。
- 保留天数输入或步进器：默认 `30`，最小 `1`。
- 提示：关闭后不自动创建历史目录和历史快照；保留天数首版仅保存设置，暂不自动清理。

保存设置：

- 写回 `.promptclip.json`。
- 保留 `pinnedTags`、`shareAuthorName` 和未来未知字段。

### 历史入口

入口位置：

- 笔记详情页的更多操作菜单，或详情页元数据/工具栏区域。

显示规则：

- 只有 `historyVersions.enabled == true` 时显示。
- 无工作区或当前笔记不存在时不显示。

建议图标：

- SF Symbols：`clock.arrow.circlepath` 或 `clock`

文案：

- 简体中文：`历史版本`
- 繁体中文：`歷史版本`
- 英文：`History versions`

### 历史版本界面

iPhone：

- 使用全屏 sheet 或较高的 bottom sheet。
- 顶部显示标题和关闭按钮。
- 默认先展示历史列表。
- 点击列表项进入详情，或列表与详情使用导航栈推进。

iPad：

- 可使用左右分栏 sheet。
- 左侧列表，右侧详情，接近 Web 端体验。

列表项：

- 标题。
- 编辑时间。
- 当前选中态。

空状态：

- 简体中文：`暂无历史版本`
- 繁体中文：`暫無歷史版本`
- 英文：`No history versions`

详情内容：

- 标题。
- 编辑时间。
- 字符数。
- 标签。
- Markdown 渲染正文。
- 操作按钮：复制、恢复。

恢复按钮：

- 恢复中禁用按钮并显示进度状态。
- 恢复期间禁止误触关闭会更安全；如允许关闭，仍必须保证任务状态不会丢失。

## 文案

至少包含以下文案键：

```text
viewHistory
historyVersions
historyLoadFailed
historyCopyFailed
historyRestoreFailed
restore
restoring
selectHistoryVersion
noHistoryVersions
copy
copied
close
loading
characterCount(count)
```

简体中文建议：

```text
查看历史版本
历史版本
读取历史版本失败
复制历史版本失败
恢复历史版本失败
恢复
恢复中...
请选择历史版本
暂无历史版本
复制
已复制
关闭
加载中...
{count} 字符
```

## 服务接口建议

iOS 端可以按现有架构命名调整，但语义需要保持一致：

```swift
protocol PromptHistoryManaging {
    func getHistoryVersions(for promptId: String) async throws -> [PromptHistoryVersion]
    func loadHistoryVersion(promptId: String, filename: String) async throws -> PromptHistoryVersion
    func createHistoryVersion(for prompt: Prompt) async
    func restoreHistoryVersion(prompt: Prompt, filename: String) async throws -> Prompt
}
```

建议分层：

- `FolderConfigService`：负责 `.promptclip.json` 读取、规范化、保存。
- `PromptService` 或 `PromptHistoryService`：负责历史版本创建、读取、恢复。
- `MarkdownParser`：负责 frontmatter 和正文解析。
- `PromptStore` 或等价状态层：恢复后更新当前笔记、列表和搜索索引。

## 测试策略

遵循 RED/GREEN TDD。先写失败测试，再实现最少代码通过测试。

### 单元测试

必须覆盖：

- 缺失 `.promptclip.json` 时历史设置默认关闭。
- 读取历史设置时规范化 `enabled` 和 `retentionDays`。
- 保存历史设置时保留 `pinnedTags`、`shareAuthorName` 和未知字段。
- 历史版本关闭时，编辑笔记不创建 `.history/` 文件。
- 历史版本启用时，编辑笔记创建 `.history/<stableId>.<timestamp>.md`。
- 复制次数增加不创建历史版本。
- 收藏切换不创建历史版本。
- 非稳定 ID 不创建历史版本。
- 历史列表只匹配精确稳定 ID 文件名。
- 旧路径型历史文件不被稳定 ID 查询匹配。
- 历史列表按 `editedAt` 倒序。
- 历史版本解析出正文、标题、标签、复制次数和收藏状态。
- 恢复前保存当前笔记为新历史版本。
- 恢复后当前笔记保留原稳定 ID。
- 恢复后标题变化时按现有保存逻辑重命名文件。
- 超过 10 个历史版本时删除最旧版本。

### UI 测试

必须覆盖：

- 历史设置关闭时详情页不显示历史入口。
- 历史设置开启时详情页显示历史入口。
- 无历史版本时显示空状态。
- 历史列表展示标题和编辑时间。
- 点击历史项后展示详情、标签、字符数和正文。
- 复制按钮成功后显示已复制状态。
- 恢复成功后关闭界面，并刷新详情页当前内容。
- 恢复失败时展示错误并保留界面。

## 验收标准

1. iOS 端可以读取 Web 端生成的 `.promptclip.json` 和 `.history/` 文件。
2. 启用历史版本后，普通编辑会保存编辑前版本到 `.history/`。
3. 关闭历史版本后，不自动创建历史目录和历史快照。
4. 历史版本入口只在启用后显示。
5. 历史列表按编辑时间倒序展示。
6. 历史详情可查看 Markdown 渲染内容，并可复制 Markdown 正文。
7. 恢复历史版本前，当前笔记会被保存为新的历史版本。
8. 恢复后当前笔记 `id` 不变，标题、正文、标签、创建时间、复制次数、收藏状态按历史版本恢复。
9. 恢复后详情页立即显示恢复后的内容，列表和搜索索引同步更新。
10. 历史版本最多保留 10 个。
11. 文件读取、复制、恢复失败时有可见错误提示，不静默失败。
12. 相关单元测试和 UI 测试通过。

## 实现边界

Always:

- 复用现有 Markdown + YAML frontmatter 文件格式。
- 使用工作区 `.promptclip.json` 作为历史版本设置的权威来源。
- 恢复前保存当前版本，保证用户内容不丢失。
- 保持当前笔记稳定 ID 不变。
- `.history/` 不进入主笔记列表。
- 错误需要记录并反馈到 UI。

Ask first:

- 是否增加 diff 对比。
- 是否允许删除历史版本。
- 是否按 `retentionDays` 做真实按天清理。
- 是否在恢复前增加二次确认弹窗。
- 是否改变最大历史版本数。

Never:

- 不引入后端、数据库或云端版本服务。
- 不把历史版本写到普通笔记列表可见目录。
- 不恢复成历史文件中的旧 ID。
- 不因为历史写入失败而静默丢弃用户编辑错误。
- 不跳过或禁用失败测试。

## 与 Web 端当前实现的关键一致性

- 历史版本默认关闭。
- 设置保存在 `.promptclip.json` 的 `historyVersions` 字段。
- `retentionDays` 当前只保存，不参与清理。
- 历史文件名使用稳定 ID 和 `YYYY-MM-DD-HHMMSS` 时间戳。
- 历史查询只认稳定 ID 文件名。
- 自动清理按数量保留最多 10 个历史版本。
- 恢复会恢复标题、正文、标签、创建时间、复制次数、收藏状态和收藏时间。
- 恢复后仍保持当前笔记稳定 ID。
- 恢复时如果标题变化，会触发当前笔记文件重命名。
