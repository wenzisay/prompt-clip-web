# SPEC: iOS 批注功能

## 目标

在 PromptClip iOS 端实现与 Web 端一致的 Prompt 批注能力。用户可以在笔记详情页为当前笔记添加纯文本批注和图片附件，批注数据使用 sidecar JSON 存储，不写入笔记 `.md` 文件。删除笔记时，对应批注 JSON 和附件目录随笔记一起进入 `.trash`。

该规格基于 Web 端 `SPEC.md` 和当前代码实现整理。iOS 端应优先保持文件格式、数据语义、存储路径和删除规则一致，便于同一个本地工作区在 Web、桌面和 iOS 之间复用。

## 用户故事

- 作为用户，我可以在笔记详情页看到"批注"区域。
- 作为用户，我可以为当前笔记新增多条纯文本批注。
- 作为用户，我可以为每条批注添加一张图片附件。
- 作为用户，我可以编辑已有批注的文本内容。
- 作为用户，我可以删除某条批注，同时删除该批注下的图片附件。
- 作为用户，我可以在笔记详情页的摘要区域看到批注数量，并点击跳转到批注区域。
- 作为用户，我可以点击图片附件放大预览。

## 范围

### 必须实现

- 批注 sidecar JSON 文件读写（`.promptclip/annotations/<promptId>.json`）。
- 图片附件二进制读写（`.promptclip/assets/<promptId>/<annotationId>/`）。
- 新增批注：纯文本 + 可选一张图片。
- 编辑批注：更新文本内容。
- 删除批注：移除 JSON 记录并同步删除该批注下的附件目录。
- 笔记详情页显示批注列表，按创建时间倒序。
- 笔记详情页摘要区域显示批注数量指示器。
- 点击摘要指示器滚动到批注区域。
- 图片附件缩略图展示和全屏预览。
- 删除笔记时，批注 JSON 和附件目录移动到 `.trash`，与笔记 `.md` 使用同一删除基名。
- 批注内容不参与全局搜索、标签筛选或排序。
- 多语言文案至少覆盖简体中文、繁体中文、英文。
- 错误提示：批注操作失败时给用户明确提示，不静默吞掉异常。

### 暂不实现

- 批注内容参与全局搜索、标签筛选或排序。
- 每条批注多张图片附件。
- 非图片附件（PDF、视频等）。
- 富文本编辑器或 Markdown 编辑器。
- 行内批注定位。
- 批注导出或分享。
- 云端同步批注。

## 数据模型

批注 sidecar JSON 是批注功能的权威数据源。

### 文件路径

```text
.promptclip/annotations/<promptId>.json
```

### JSON 结构

```json
{
  "promptId": "11111111111111111",
  "version": 1,
  "annotations": [
    {
      "id": "annotation-1748563200000-a1b2c3",
      "text": "这条 Prompt 在翻译任务上效果很好",
      "attachments": [
        {
          "id": "attachment-1748563201000-d4e5f6",
          "type": "image",
          "name": "screenshot.png",
          "mimeType": "image/png",
          "path": ".promptclip/assets/11111111111111111/annotation-1748563200000-a1b2c3/attachment-1748563201000-d4e5f6.png",
          "size": 102400,
          "createdAt": "2026-05-30T08:00:01.000Z"
        }
      ],
      "createdAt": "2026-05-30T08:00:00.000Z",
      "updatedAt": "2026-05-30T08:00:00.000Z"
    }
  ],
  "createdAt": "2026-05-30T08:00:00.000Z",
  "updatedAt": "2026-05-30T08:00:00.000Z"
}
```

### Swift 模型建议

```swift
struct PromptAnnotationFile: Codable, Equatable {
    let promptId: String
    let version: Int
    var annotations: [PromptAnnotation]
    let createdAt: String
    var updatedAt: String
}

struct PromptAnnotation: Codable, Identifiable, Equatable {
    let id: String
    var text: String
    var attachments: [AnnotationAttachment]
    let createdAt: String
    var updatedAt: String
}

struct AnnotationAttachment: Codable, Identifiable, Equatable {
    let id: String
    let type: String   // 当前固定为 "image"
    let name: String
    let mimeType: String
    let path: String   // 相对于工作区根目录的路径
    let size: Int
    let createdAt: String
}
```

### 字段规则

- `version` 固定为 `1`。
- `promptId` 对应笔记 frontmatter 中的稳定 ID。
- `annotations` 中每条批注的 `id` 格式为 `annotation-<timestamp>-<shortId>`，全局唯一。
- `attachments` 中每个附件的 `id` 格式为 `attachment-<timestamp>-<shortId>`。
- `path` 使用相对工作区根目录的路径，例如 `.promptclip/assets/<promptId>/<annotationId>/<attachmentId>.png`。
- `createdAt` 和 `updatedAt` 使用 ISO 8601 字符串。
- 批注文本必须 trim 后非空。
- 每条批注最多 1 张图片附件。
- 图片附件大小上限为 5MB（5,242,880 字节）。
- 图片附件只接受 `image/*` MIME 类型。
- 不把图片 base64 写入 JSON。

## 文件组织

### 存储目录结构

```text
.promptclip/
  annotations/
    <promptId>.json
  assets/
    <promptId>/
      <annotationId>/
        <attachmentId>.<ext>
```

### 回收站目录结构

删除笔记时，批注和附件使用与笔记 `.md` 相同的删除基名进入 `.trash`：

```text
.trash/
  <trashBase>.md
  annotations/
    <trashBase>.json
  assets/
    <trashBase>/
```

`<trashBase>` 格式为 `<filenameWithoutExt>.<timestamp>`，与笔记删除逻辑保持一致。

规则：

- `.promptclip/annotations/` 和 `.promptclip/assets/` 不参与主笔记列表扫描。
- 创建批注或附件前确保对应目录存在。
- 删除单条批注时，同步删除 `.promptclip/assets/<promptId>/<annotationId>/` 目录。
- 删除笔记时，批注 JSON 移动到 `.trash/annotations/<trashBase>.json`，附件目录移动到 `.trash/assets/<trashBase>/`。

## 核心行为

### 加载批注列表

输入：当前工作区、当前笔记稳定 ID。

流程：

1. 构建路径 `.promptclip/annotations/<promptId>.json`。
2. 读取并解析 JSON 文件。
3. 如果文件不存在，返回空批注文件（`annotations: []`）。
4. 规范化 JSON 内容：缺失字段使用合理默认值，确保 `version` 为 `1`。

错误处理：

- 文件不存在时返回空批注，不抛错。
- JSON 格式无效时抛错，不静默吞掉。
- 单条批注数据异常时建议在 UI 上提示错误。

### 新增批注

输入：当前笔记 ID、批注文本、可选图片数据。

流程：

1. 校验文本 trim 后非空。
2. 校验图片（如果有）：MIME 类型必须以 `image/` 开头，大小不超过 5MB。
3. 读取现有批注文件（不存在时创建空文件）。
4. 生成批注 ID：`annotation-<当前毫秒时间戳>-<shortId>`。
5. 如果有图片：
   - 生成附件 ID：`attachment-<当前毫秒时间戳>-<shortId>`。
   - 确定文件扩展名：优先使用原始文件名扩展名，否则根据 MIME 类型推断（`image/jpeg` → `.jpg`，`image/png` → `.png`，兜底 `.img`）。
   - 构建附件路径：`.promptclip/assets/<promptId>/<annotationId>/<attachmentId>.<ext>`。
   - 创建目录并写入图片二进制数据。
   - 构建附件记录，`path` 使用相对工作区根的路径。
6. 将新批注插入到 annotations 数组头部。
7. 更新文件级 `updatedAt`。
8. 写入 JSON 文件。

### 编辑批注

输入：当前笔记 ID、目标批注 ID、新文本。

流程：

1. 校验文本 trim 后非空。
2. 读取批注文件。
3. 查找目标批注 ID，不存在则抛错。
4. 更新文本和 `updatedAt`。
5. 更新文件级 `updatedAt`。
6. 写入 JSON 文件。

注意：编辑不改变附件。

### 删除批注

输入：当前笔记 ID、目标批注 ID。

流程：

1. 读取批注文件。
2. 查找目标批注，不存在则抛错。
3. 删除该批注下的附件目录：`.promptclip/assets/<promptId>/<annotationId>/`。
4. 从 JSON 的 annotations 数组中移除该批注。
5. 更新文件级 `updatedAt`。
6. 写入 JSON 文件。

### 删除笔记时移动批注到回收站

输入：当前笔记 ID、删除基名 `trashBase`。

流程：

1. 检查 `.promptclip/annotations/<promptId>.json` 是否存在。
2. 如果存在，创建 `.trash/annotations/` 目录，将 JSON 移动到 `.trash/annotations/<trashBase>.json`。
3. 检查 `.promptclip/assets/<promptId>/` 是否存在。
4. 如果存在，创建 `.trash/assets/` 目录，将整个目录移动到 `.trash/assets/<trashBase>/`。

注意：

- `trashBase` 必须与笔记 `.md` 的删除基名一致，确保同一笔记的所有相关文件在回收站中可关联。
- 移动操作失败时需要暴露错误，不静默忽略。

### 读取附件二进制

输入：附件对象（包含 `path` 和 `mimeType`）。

流程：

1. 根据附件 `path` 读取二进制数据。
2. 返回 `Data` 和 MIME 类型，用于展示图片。

## iOS 界面规格

### 笔记详情页 — 批注区域

位置：

- 笔记详情页底部，与其他元信息区域用分隔线隔开。

内容：

- 标题："批注" / "批註" / "Annotations"。
- 加载状态指示器。
- 新增批注输入区。
- 错误提示（如有）。
- 批注列表。

### 新增批注输入区

- 文本输入框：多行文本，placeholder 为"记录这条 Prompt 的使用效果..."。
- 图片选择按钮：点击后弹出系统图片选择器（PHPickerViewController），限制 `image/*`。
- 已选图片预览：显示文件名和移除按钮。
- 保存按钮：文本为空时禁用；保存中显示加载状态。

图片选择校验：

- 非 `image/*` 类型提示"仅支持图片附件"。
- 超过 5MB 提示"图片不能超过 5MB"。

### 批注列表

- 每条批注显示：文本内容、附件缩略图（如有）、创建/编辑时间、编辑按钮、删除按钮。
- 按创建时间倒序排列。
- 无批注时显示空状态："暂无批注" / "暫無批註" / "No annotations yet"。

### 批注项

展示状态：

- 文本内容（支持换行）。
- 附件区域：缩略图 + 文件名。点击缩略图进入全屏预览。
- 时间信息：仅创建时间时显示"创建于 <time>"，编辑过时显示"编辑于 <time>"。
- 编辑按钮和删除按钮。

编辑状态：

- 点击编辑后，文本变为可编辑的多行输入框。
- 保存和取消按钮。
- 保存时文本为空则禁用保存按钮。

删除确认：

- 点击删除后弹出系统确认弹窗："确定要删除这条批注吗？"。
- 确认后执行删除。

### 图片全屏预览

- 背景半透明遮罩。
- 图片居中显示，支持缩放。
- 关闭按钮（右上角 X）。
- 点击遮罩区域关闭。
- 建议使用 `FullScreenCover` 或自定义模态视图实现。

### 摘要区域批注指示器

位置：

- 笔记详情页的摘要/元数据区域。

内容：

- 图标 + 批注数量文本，例如"无批注"或"3 条批注"。
- 点击后滚动到详情页底部的批注区域。

## 文案

至少包含以下文案键：

| 键 | 简体中文 | 繁体中文 | 英文 |
|---|---|---|---|
| `annotations` | 批注 | 批註 | Annotations |
| `noAnnotations` | 暂无批注 | 暫無批註 | No annotations yet |
| `annotationPlaceholder` | 记录这条 Prompt 的使用效果... | 記錄這條 Prompt 的使用效果... | Record how this prompt worked... |
| `saveAnnotation` | 保存批注 | 儲存批註 | Save annotation |
| `savingAnnotation` | 保存中... | 儲存中... | Saving... |
| `addImage` | 添加图片 | 添加圖片 | Add image |
| `removeImage` | 移除图片 | 移除圖片 | Remove image |
| `editAnnotation` | 编辑批注 | 編輯批註 | Edit annotation |
| `deleteAnnotation` | 删除批注 | 刪除批註 | Delete annotation |
| `annotationDeleteConfirm` | 确定要删除这条批注吗？ | 確定要刪除這條批註嗎？ | Delete this annotation? |
| `annotationLoadFailed` | 读取批注失败 | 讀取批註失敗 | Failed to read annotations |
| `annotationSaveFailed` | 保存批注失败 | 儲存批註失敗 | Failed to save annotation |
| `annotationImageTooLarge` | 图片不能超过 5MB | 圖片不能超過 5MB | Image must be 5MB or smaller |
| `annotationImageOnly` | 仅支持图片附件 | 僅支援圖片附件 | Only image attachments are supported |
| `annotationImageSelected(name)` | 已选择 {name} | 已選擇 {name} | Selected {name} |
| `annotationCreatedAt(time)` | 创建于 {time} | 建立於 {time} | Created {time} |
| `annotationUpdatedAt(time)` | 编辑于 {time} | 編輯於 {time} | Edited {time} |
| `annotationImageAlt(name)` | 批注图片 {name} | 批註圖片 {name} | Annotation image {name} |
| `openAnnotationImage` | 放大查看图片 | 放大查看圖片 | Open image preview |
| `closeAnnotationImage` | 关闭图片预览 | 關閉圖片預覽 | Close image preview |
| `noAnnotationSummary` | 无批注 | 無批註 | No annotations |
| `annotationSummary(count)` | {count} 条批注 | {count} 條批註 | {count} annotation(s) |

## 服务接口建议

iOS 端可以按现有架构命名调整，但语义需要保持一致：

```swift
protocol AnnotationManaging {
    /// 加载指定笔记的批注列表。文件不存在时返回空批注文件。
    func loadAnnotations(workspace: WorkspaceRef, promptId: String) async throws -> PromptAnnotationFile

    /// 新增批注。支持可选图片附件。
    func createAnnotation(
        workspace: WorkspaceRef,
        promptId: String,
        text: String,
        image: AnnotationImageInput?
    ) async throws -> PromptAnnotationFile

    /// 更新批注文本。
    func updateAnnotation(
        workspace: WorkspaceRef,
        promptId: String,
        annotationId: String,
        text: String
    ) async throws -> PromptAnnotationFile

    /// 删除批注，同步删除附件目录。
    func deleteAnnotation(
        workspace: WorkspaceRef,
        promptId: String,
        annotationId: String
    ) async throws -> PromptAnnotationFile

    /// 删除笔记时移动批注到回收站。
    func moveAnnotationsToTrash(
        workspace: WorkspaceRef,
        promptId: String,
        trashBase: String
    ) async throws

    /// 读取附件二进制数据。
    func readAttachment(workspace: WorkspaceRef, attachment: AnnotationAttachment) async throws -> Data
}

struct AnnotationImageInput {
    let data: Data
    let name: String
    let mimeType: String
}
```

建议分层：

- `AnnotationService`：批注 CRUD、附件写入、回收站移动。
- `FileRepository`：底层文件读写，需支持二进制读写和目录操作。
- `AnnotationStore` 或等价状态层：管理当前选中笔记的批注状态，处理加载中/保存中/错误状态。

## 测试策略

遵循 RED/GREEN TDD。先写失败测试，再实现最少代码通过测试。

### 单元测试

必须覆盖：

- 首次读取不存在的批注文件时返回空批注列表。
- 新增批注会创建 `.promptclip/annotations/<promptId>.json`。
- 新增批注时文本写入正确，`createdAt` 和 `updatedAt` 一致。
- 新增批注带图片时，图片写入 `.promptclip/assets/<promptId>/<annotationId>/`。
- 编辑批注只更新目标批注文本和 `updatedAt`，不影响其他批注。
- 编辑不存在的批注 ID 时抛错。
- 删除批注会从 JSON 中移除对应记录。
- 删除批注同步删除该批注下的附件目录。
- 删除不存在的批注 ID 时抛错。
- 同一条批注只能有一张图片附件。
- 图片超过 5MB 时抛错。
- 非 `image/*` MIME 类型附件时抛错。
- 批注文本为空（trim 后）时抛错。
- 删除笔记时，批注 JSON 和附件目录移动到 `.trash` 并使用正确的删除基名。
- 删除笔记时如果批注文件不存在，不抛错。
- 删除笔记时如果附件目录不存在，不抛错。
- JSON 中附件的 `path` 是相对工作区根的路径。

### UI 测试

必须覆盖：

- 无批注时展示空状态文案。
- 有批注时按创建时间倒序展示。
- 可以输入文本并触发新增。
- 文本为空时保存按钮禁用。
- 图片附件显示缩略图。
- 点击缩略图打开全屏预览。
- 编辑批注：点击编辑进入编辑状态，保存后退出编辑状态。
- 删除批注：弹出确认弹窗，确认后批注从列表消失。
- 摘要区域显示批注数量。
- 操作失败时展示错误提示。

## 验收标准

1. iOS 端可以读取 Web 端生成的 `.promptclip/annotations/<promptId>.json` 和 `.promptclip/assets/` 附件。
2. 新增批注后 JSON 文件和附件文件写入正确路径。
3. 编辑批注只更新文本和时间戳，不影响附件。
4. 删除批注后 JSON 和附件目录都被清理。
5. 删除笔记后批注 JSON 和附件目录使用与笔记相同的删除基名进入 `.trash`。
6. 图片附件只接受 `image/*` 类型，单张不超过 5MB。
7. 每条批注最多一张图片附件。
8. 批注内容不参与全局搜索、标签筛选或排序。
9. 刷新应用并重新加载工作区后，批注和图片附件仍可显示。
10. 操作失败时有可见错误提示，不静默失败。
11. 相关单元测试和 UI 测试通过。

## 实现边界

Always:

- 批注存储为 sidecar JSON，不写入笔记 `.md` 文件。
- 图片附件存储为工作区内独立文件，不使用 base64 内联。
- 每条批注最多允许 1 张图片附件，单张最大 5MB。
- 删除单条批注时同步删除该批注下的附件目录。
- 删除笔记时批注 JSON 和附件目录使用同一删除基名进入 `.trash`。
- 批注不参与搜索、标签筛选或排序。
- 所有文件操作失败都暴露明确错误。
- ID 格式为 `<prefix>-<timestamp>-<shortId>`。

Ask first:

- 是否支持每条批注多张图片。
- 是否支持非图片附件。
- 是否增加富文本或 Markdown 编辑器。
- 是否增加行内批注定位。
- 是否增加批注导出或分享。
- 是否增加运行时依赖。

Never:

- 不上传批注文本或图片到外部服务。
- 不引入后端、数据库或云同步。
- 不把批注内容追加到笔记正文。
- 不静默吞掉 JSON 解析、附件写入、移动到 `.trash` 的失败。
- 不跳过或禁用失败测试。
- 不删除用户已有文件，除非用户明确执行删除笔记或删除批注动作。

## 与 Web 端当前实现的关键一致性

- 批注 JSON 存储在 `.promptclip/annotations/<promptId>.json`。
- 图片附件存储在 `.promptclip/assets/<promptId>/<annotationId>/<attachmentId>.<ext>`。
- JSON 中的 `path` 字段使用相对工作区根的路径。
- `version` 固定为 `1`。
- 批注 ID 格式 `annotation-<timestamp>-<shortId>`，附件 ID 格式 `attachment-<timestamp>-<shortId>`。
- 每条批注最多 1 张图片，单张最大 5MB。
- 图片扩展名优先使用原始文件名，否则按 MIME 类型推断（`.jpg` / `.png` / `.img`）。
- 批注列表按创建时间倒序。
- 编辑只更新文本和 `updatedAt`，不影响附件。
- 删除单条批注同步删除附件目录。
- 删除笔记时批注 JSON 移动到 `.trash/annotations/<trashBase>.json`，附件目录移动到 `.trash/assets/<trashBase>/`。
- `trashBase` 与笔记 `.md` 的删除基名一致。
- 批注不参与搜索和排序。
- 文件不存在时返回空批注列表，不抛错。
