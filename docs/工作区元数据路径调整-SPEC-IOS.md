# SPEC: iOS 工作区元数据路径调整

## 目标

在 PromptClip iOS 端实现与 Web 端一致的工作区元数据路径规则。配置、批注、附件、历史版本和回收站统一存放到工作区根目录的 `_promptclip/` 目录下，避免根目录隐藏文件或隐藏目录被同步工具忽略。

该规格基于 Web 端已实现行为整理。iOS 端应保持文件路径、数据结构、错误处理和主笔记扫描规则一致，便于同一个本地工作区在 Web、桌面和 iOS 之间复用。

当前产品尚未上线，本规格不要求旧路径兼容、旧数据迁移或旧路径清理。

## 用户故事

- 作为用户，我可以打开一个只有普通 `.md` 文件、没有 `_promptclip/` 目录的工作区，并正常看到笔记列表。
- 作为用户，我在 iOS 端创建配置、批注、附件、历史版本或删除笔记后，所有 PromptClip 元数据都出现在 `_promptclip/` 下。
- 作为用户，我使用同步工具同步工作区时，不会因为根目录点文件或根目录点目录而漏同步配置和批注数据。
- 作为跨端用户，我可以在 Web、桌面和 iOS 之间复用同一个工作区，元数据路径保持一致。

## 路径变更

| 旧路径 | 新路径 |
|---|---|
| `.promptclip.json` | `_promptclip/promptclip.config.json` |
| `.promptclip/annotations/` | `_promptclip/annotations/` |
| `.promptclip/assets/` | `_promptclip/assets/` |
| `.history/` | `_promptclip/.history/` |
| `.trash/` | `_promptclip/.trash/` |

说明：

- 回收站路径是 `_promptclip/.trash/`，不是 `_promptcip/.trash/`。
- `.history` 和 `.trash` 保持点目录，但只存在于 `_promptclip/` 内部。
- iOS 端不得继续读写 `.promptclip.json`、`.promptclip/`、`.history/`、`.trash/`。

## 范围

### 必须实现

- 工作区配置读写路径切换为 `_promptclip/promptclip.config.json`。
- 批注 sidecar JSON 路径切换为 `_promptclip/annotations/<promptId>.json`。
- 批注图片附件路径切换为 `_promptclip/assets/<promptId>/<annotationId>/...`。
- 历史版本路径切换为 `_promptclip/.history/<stableId>.YYYY-MM-DD-HHMMSS.md`。
- 回收站路径切换为 `_promptclip/.trash/`。
- 主笔记扫描必须排除整个 `_promptclip/` 目录。
- 缺失 `_promptclip/` 目录或缺失配置文件时，读取配置返回默认配置，不得阻断普通 `.md` 加载。
- 写入配置、批注、附件、历史版本、回收站文件前，必须按需创建父目录。
- 文件不存在类错误应按业务语义处理为“无配置 / 无批注 / 无历史”，不能作为加载失败。

### 暂不实现

- 旧路径兼容读取。
- 旧路径到新路径的数据迁移。
- 自动清理旧路径数据。
- 改变批注 JSON 数据结构版本。
- 改变历史版本数量上限或清理策略。
- 改变回收站恢复能力。
- 新增云同步、文件监听或后端存储。

## 工作区目录结构

```text
<workspace>/
  Prompt A.md
  folder/
    Prompt B.md
  _promptclip/
    promptclip.config.json
    annotations/
      <promptId>.json
    assets/
      <promptId>/
        <annotationId>/
          <attachmentId>.<ext>
    .history/
      <stableId>.YYYY-MM-DD-HHMMSS.md
    .trash/
      <trashBase>.md
      annotations/
        <trashBase>.json
      assets/
        <trashBase>/
```

主笔记列表只扫描 `_promptclip/` 之外的 `.md` 文件。

## 工作区配置

路径：

```text
_promptclip/promptclip.config.json
```

JSON 结构保持与 Web 端一致：

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

读取规则：

- 文件不存在时返回默认配置。
- `_promptclip/` 目录不存在时返回默认配置。
- JSON 格式错误时返回默认配置，并记录诊断日志。
- 不读取 `.promptclip.json`。

写入规则：

- 写入前创建 `_promptclip/` 目录。
- 写入时规范化字段：
  - `pinnedTags` 去重，只保留字符串。
  - `shareAuthorName` trim。
  - `historyVersions.enabled` 只有严格为 `true` 才视为启用。
  - `historyVersions.retentionDays` 至少为 `1`，缺失时默认 `30`。
- 更新单个字段时保留其他配置字段。

Swift 模型建议：

```swift
struct WorkspaceConfig: Codable, Equatable {
    var historyVersions: HistoryVersionSettings
    var pinnedTags: [String]
    var shareAuthorName: String
}

struct HistoryVersionSettings: Codable, Equatable {
    var enabled: Bool
    var retentionDays: Int
}
```

## 批注与附件

批注 sidecar 路径：

```text
_promptclip/annotations/<promptId>.json
```

附件路径：

```text
_promptclip/assets/<promptId>/<annotationId>/<attachmentId>.<ext>
```

附件 `path` 字段必须保存相对工作区根目录的新路径：

```json
{
  "id": "attachment-1748563201000-d4e5f6",
  "type": "image",
  "name": "screenshot.png",
  "mimeType": "image/png",
  "path": "_promptclip/assets/11111111111111111/annotation-1748563200000-a1b2c3/attachment-1748563201000-d4e5f6.png",
  "size": 102400,
  "createdAt": "2026-05-30T08:00:01.000Z"
}
```

规则：

- 批注 JSON 数据结构版本保持 `version: 1`。
- 批注文件不存在时返回空批注文件。
- `_promptclip/annotations/` 不存在时返回空批注文件。
- 新增或更新批注前创建 `_promptclip/annotations/`。
- 写入附件前创建 `_promptclip/assets/<promptId>/<annotationId>/`。
- 删除单条批注时，删除 `_promptclip/assets/<promptId>/<annotationId>/`。
- 不读取 `.promptclip/annotations/` 或 `.promptclip/assets/`。

## 历史版本

历史目录：

```text
_promptclip/.history/
```

历史文件命名：

```text
_promptclip/.history/<stableId>.YYYY-MM-DD-HHMMSS.md
```

规则：

- 历史版本默认关闭，只有 `_promptclip/promptclip.config.json` 中 `historyVersions.enabled == true` 时才写入。
- 创建历史版本前创建 `_promptclip/.history/`。
- 历史版本文件内容是当前笔记原始 Markdown 全文。
- 历史版本列表只扫描 `_promptclip/.history/`。
- 只匹配当前稳定 ID 的精确文件名格式：`^<stableId>\.\d{4}-\d{2}-\d{2}-\d{6}\.md$`。
- `_promptclip/.history/` 不参与主笔记列表扫描。
- 继续保留 Web 端规则：最多保留 10 个历史版本，超过后按文件修改时间删除最旧版本。
- 不读取 `.history/`。

## 回收站

回收站目录：

```text
_promptclip/.trash/
```

删除笔记时：

```text
_promptclip/.trash/
  <trashBase>.md
  annotations/
    <trashBase>.json
  assets/
    <trashBase>/
```

规则：

- 删除 Prompt 前创建 `_promptclip/.trash/`。
- Prompt 文件移动到 `_promptclip/.trash/<trashBase>.md`。
- 如果存在批注 JSON，移动到 `_promptclip/.trash/annotations/<trashBase>.json`。
- 如果存在附件目录，移动到 `_promptclip/.trash/assets/<trashBase>/`。
- 批注 JSON 和附件目录与 Prompt 文件使用相同 `<trashBase>`。
- 不写入 `.trash/`。

`<trashBase>` 规则：

- 稳定 ID 可持久化时：`<stableId>.YYYY-MM-DD-HHMMSS`。
- 非稳定 ID 或临时 legacy ID 时：`<currentFilenameWithoutExt>.YYYY-MM-DD-HHMMSS`。

## 主笔记扫描

扫描规则：

1. 从工作区根目录递归扫描 `.md` 文件。
2. 跳过整个 `_promptclip/` 目录。
3. 保持现有点目录策略：是否跳过其他点目录由 iOS 端既有规则决定，但 `_promptclip/` 必须无条件跳过。
4. `_promptclip/.history/*.md` 和 `_promptclip/.trash/*.md` 不得出现在主笔记列表中。
5. 工作区没有 `_promptclip/` 时，扫描普通 `.md` 不应失败。

伪代码：

```swift
func shouldIncludePromptFile(relativePath: String) -> Bool {
    guard relativePath.lowercased().hasSuffix(".md") else {
        return false
    }
    return relativePath != "_promptclip"
        && !relativePath.hasPrefix("_promptclip/")
}
```

## 文件系统错误处理

iOS 端需要区分“路径不存在”和“真正失败”。

应返回默认或空结果的情况：

- `_promptclip/` 不存在。
- `_promptclip/promptclip.config.json` 不存在。
- `_promptclip/annotations/<promptId>.json` 不存在。
- `_promptclip/.history/` 不存在。
- 删除 Prompt 时批注 JSON 或附件目录不存在。

应向上抛出或展示错误的情况：

- 无权限访问工作区。
- 文件存在但无法读取。
- 写入、移动、删除失败。
- 路径逃逸工作区根目录。
- JSON 存在但写回失败。

Web 端已修复的关键行为：

- 检查 `_promptclip/promptclip.config.json` 是否存在时，如果父目录 `_promptclip/` 不存在，应返回 `false`，不能抛错阻断加载。
- iOS 端文件仓储也必须遵守该行为。

## 测试策略

建议使用 XCTest 覆盖服务层和文件仓储层。

必须覆盖：

- 没有 `_promptclip/`、只有普通 `.md` 的工作区可以正常加载笔记。
- 读取缺失 `_promptclip/promptclip.config.json` 返回默认配置。
- `exists("_promptclip/promptclip.config.json")` 在 `_promptclip/` 不存在时返回 `false`。
- 写入配置创建 `_promptclip/` 并生成 `promptclip.config.json`。
- 创建批注写入 `_promptclip/annotations/<promptId>.json`。
- 创建图片附件写入 `_promptclip/assets/...`，JSON 中 `path` 为新路径。
- 启用历史版本后，编辑笔记写入 `_promptclip/.history/`。
- 删除笔记后，笔记、批注 JSON、附件目录移动到 `_promptclip/.trash/`。
- 主笔记扫描不会返回 `_promptclip/.history/*.md` 或 `_promptclip/.trash/*.md`。
- 旧路径 `.promptclip.json`、`.promptclip/`、`.history/`、`.trash/` 不被读取或写入。

## 验收标准

1. iOS 端打开一个无 `_promptclip/` 目录但包含 `.md` 文件的工作区，笔记列表正常显示。
2. 首次保存置顶标签、历史设置或分享作者名后，生成 `_promptclip/promptclip.config.json`。
3. 新增批注后，生成 `_promptclip/annotations/<promptId>.json`。
4. 新增批注图片后，生成 `_promptclip/assets/...`，附件 JSON 的 `path` 使用新路径。
5. 启用历史版本并编辑笔记后，生成 `_promptclip/.history/<stableId>.<timestamp>.md`。
6. 删除笔记后，相关文件进入 `_promptclip/.trash/`。
7. `_promptclip/` 下任何 `.md` 都不会被主列表当成用户笔记。
8. 旧路径不再被 iOS 新实现读写。
9. 与 Web 端使用同一工作区时，配置、批注、附件、历史版本和回收站文件可互相识别。

## 边界

Always:

- 新写入路径必须使用 `_promptclip/` 根目录。
- 缺失 `_promptclip/` 不是错误。
- 主笔记扫描必须排除 `_promptclip/`。
- 写入嵌套文件前必须创建父目录。
- 文件操作失败不能静默吞掉；只有明确的“文件不存在”场景可降级为空结果。

Ask first:

- 是否需要旧路径兼容或迁移。
- 是否把 `.history` 或 `.trash` 改成非点目录。
- 是否改变批注 JSON 版本。
- 是否调整历史版本保留策略。
- 是否新增 iCloud 或第三方同步专用配置。

Never:

- 不同时写入新旧两套路径。
- 不把 `_promptclip/` 下的 `.md` 展示为用户笔记。
- 不把工作区配置只存入 `UserDefaults`。
- 不因配置文件缺失阻断普通 `.md` 加载。
- 不引入后端、数据库或云端依赖。

## Open Questions

无。当前决策与 Web 端一致：

- 不做旧数据兼容与迁移。
- `.history` 和 `.trash` 保持点目录。
- 元数据根目录统一为 `_promptclip/`。
