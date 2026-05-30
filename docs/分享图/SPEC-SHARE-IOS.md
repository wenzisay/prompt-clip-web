# SPEC: iOS 笔记分享图片功能

## 目标

在 PromptClip iOS 端新增“分享图片”功能。用户可以从单条笔记的更多操作入口打开分享面板，将当前笔记渲染为适合手机阅读和社交分享的图片卡片，并支持保存到相册、复制图片、调用系统分享面板。

该规格基于 Web 端当前实现和多轮调整后的最终行为，iOS 端应保持功能、配置和视觉输出一致。

## 用户故事

- 作为用户，我可以在笔记详情或笔记列表的更多菜单中点击“分享”，生成当前笔记的图片卡片。
- 作为用户，我可以选择不同卡片模板，并实时预览图片效果。
- 作为用户，我可以控制作者信息、PromptClip 标志、笔记标签、Markdown 渲染是否显示。
- 作为用户，我可以在设置页配置分享作者名称，刷新或重新打开工作区后仍然保留。
- 作为用户，我可以将生成图片保存、复制或通过 iOS 系统分享面板发送到其他 App。

## 范围

### 必须实现

- 单条笔记分享入口。
- 分享图片预览页或 bottom sheet。
- 3 个内置模板：极简白、深色、淡彩边框。
- 输出图片宽度固定为 `800px`，高度随内容自动扩展。
- 分享正文最多使用前 `2000` 个字符，超出后截断并显示提示。
- 默认渲染 Markdown；可切换为纯文本。
- 可选项：
  - 显示作者信息
  - 显示 PromptClip 标志
  - 显示笔记中的标签
  - 渲染 Markdown
- 设置页配置分享作者名称。
- 作者名称写入工作区配置文件 `.promptclip.json`。
- 生成图片支持：
  - 保存到相册
  - 复制到剪贴板
  - 系统分享面板
- 多语言文案至少覆盖简体中文、繁体中文、英文。

### 暂不实现

- 自定义模板编辑器。
- 云端分享、外链分享、二维码分享。
- 持久化分享面板中的模板和开关选择。
- 多尺寸导出。
- 将分享设置写入单条笔记文件。

## 数据模型

### 工作区配置文件

文件名：`.promptclip.json`

iOS 端需要兼容并维护以下字段：

```json
{
  "historyVersions": {
    "enabled": false,
    "retentionDays": 30
  },
  "pinnedTags": [],
  "shareAuthorName": "作者名称"
}
```

### 字段规则

- `shareAuthorName`
  - 类型：`String`
  - 默认值：空字符串
  - 读取时需要 `trim`
  - 非字符串、缺失、解析失败时回退为空字符串
  - 保存设置时写回 `.promptclip.json`
  - 不应依赖 UserDefaults 作为最终来源，避免跨工作区串值

### 分享选项

```swift
struct ShareImageOptions {
    var showAuthor: Bool = true
    var showLogo: Bool = true
    var showTags: Bool = true
    var renderMarkdown: Bool = true
}
```

关闭分享面板后，选项恢复默认值；首版不记忆上次选择。

## 分享入口

入口位置：

- 笔记列表卡片更多菜单
- 笔记详情页更多菜单，如 iOS 端已有详情操作入口，优先放在那里

菜单项：

- 简体中文：`分享`
- 繁体中文：`分享`
- 英文：`Share`

图标建议：

- iOS 使用 `square.and.arrow.up`

点击后：

- 设置当前分享笔记。
- 打开分享图片面板。

## 分享面板

### 布局建议

iPhone：

- 使用 bottom sheet 或全屏 modal。
- 顶部：标题 `生成分享图片` / `Share image`
- 中部：图片预览，可纵向滚动。
- 下部：模板选择、展示项开关、操作按钮。

iPad：

- 可以使用居中 sheet。
- 左侧模板和开关，右侧预览，与 Web 端接近。

### 面板状态

默认状态：

- 模板：极简白
- 显示作者信息：开
- 显示 PromptClip 标志：开
- 显示笔记中的标签：开
- 渲染 Markdown：开

关闭面板：

- 清空临时状态。
- 下次打开恢复默认状态。

## 图片输出规格

### 尺寸

- 输出图片宽度：`800px`
- 输出图片高度：根据内容自动扩展
- 不输出 2x 宽度图片；最终 PNG 像素宽度就是 `800`

### 外层画布

Web 端当前实现：

- 根节点宽度：`800px`
- 外层 padding：`24px`
- 内层卡片宽度：占满剩余宽度

iOS 可按以下尺寸换算实现：

```text
Canvas width: 800
Outer padding: 24
Card width: 752
Card horizontal padding: 48
Card vertical padding: 44
Corner radius: 8
```

### 内容截断

- 使用笔记正文前 `2000` 个字符。
- 超出后截断，并显示提示：
  - 简体中文：`内容已截断至 2000 字符。`
  - 繁体中文：`內容已截斷至 2000 字元。`
  - 英文：`Content truncated at 2000 characters.`

截断基于原始 Markdown 文本长度，而不是渲染后的纯文本长度。

## 卡片内容

显示顺序：

1. 作者名称，如果 `showAuthor == true` 且 `shareAuthorName` 非空
2. 标题
3. 标签，如果 `showTags == true` 且笔记有标签
4. 正文
5. 截断提示，如果内容被截断
6. 右下角 PromptClip logo，如果 `showLogo == true`

不显示：

- 日期
- copy count
- 使用次数
- flomo 标志
- 任何底部统计文字

## 字号与排版

当前 Web 端最终视觉参数：

```text
作者名称: 18px, medium, opacity 0.75
标题: 36px, semibold, line-height tight
标签: 18px, medium
Markdown 正文: 20px, line-height 1.8
纯文本正文: 20px, line-height 36px
截断提示: 14px, opacity 0.55
底部 PromptClip 文本: 14px, medium, opacity 0.75
Logo 图片: 28px x 28px
```

iOS 端建议使用固定字号，不随系统 Dynamic Type 改变导出图片字号。预览 UI 可以适配 Dynamic Type，但生成图片应稳定。

SwiftUI 近似：

```swift
Text(authorName)
    .font(.system(size: 18, weight: .medium))

Text(prompt.title)
    .font(.system(size: 36, weight: .semibold))
    .lineSpacing(2)

Text(body)
    .font(.system(size: 20))
    .lineSpacing(8)
```

长标题、长代码行、长 URL 必须换行，不允许溢出卡片。

## Markdown 渲染

默认启用 Markdown 渲染。

### renderMarkdown = true

iOS 端应将 Markdown 转为富文本或 SwiftUI 视图：

- 标题
- 段落
- 列表
- 代码块
- 行内代码
- 引用

最低验收：

- 列表能正常缩进和换行。
- 代码块使用等宽字体，并且长行自动换行。
- 渲染失败时不要崩溃，回退到纯文本。

### renderMarkdown = false

- 使用原始 Markdown 字符串。
- 保留换行。
- 使用普通正文样式。
- 长行自动换行。

## 模板

模板 ID 需要和 Web 端一致，便于未来跨端同步：

```swift
enum ShareTemplateId: String, Codable {
    case minimal
    case dark
    case pastel
}
```

### 极简白 minimal

用途：干净留白，适合长文本阅读。

```text
Preview background: #F5F5F4
Card background: #FFFFFF
Text: stone-800 / approx #292524
Title: stone-900 / approx #1C1917
Content: stone-700 / approx #44403C
Tag background: stone-100 / approx #F5F5F4
Tag text: stone-500 / approx #78716C
Logo opacity: 0.55
Shadow: 0 24 80 rgba(15, 23, 42, 0.12)
```

### 深色 dark

用途：高对比展示，适合短句分享。

```text
Preview background: #111827
Card background: #171717
Text: stone-100 / approx #F5F5F4
Title: #FFFFFF
Content: stone-200 / approx #E7E5E4
Tag background: rgba(255, 255, 255, 0.10)
Tag text: stone-200 / approx #E7E5E4
Logo opacity: 0.70
Logo rendering: invert or use light monochrome variant
Shadow: 0 24 80 rgba(0, 0, 0, 0.28)
```

### 淡彩边框 pastel

用途：柔和边框，适合结构化笔记。

```text
Preview background: #EEF6F1
Card background: #FFFDF8
Border: emerald-100 / approx #D1FAE5
Text: stone-800 / approx #292524
Title: emerald-950 / approx #022C22
Content: stone-700 / approx #44403C
Tag background: emerald-50 / approx #ECFDF5
Tag text: emerald-700 / approx #047857
Logo opacity: 0.55
Shadow: 0 24 80 rgba(16, 185, 129, 0.14)
```

## Logo

来源：

- 基于项目中的 `docs/icon.png`
- iOS 端应内置一个小尺寸分享 logo 资源，建议 `128x128`
- 输出卡片中显示为 `28px x 28px`

显示位置：

- 卡片底部右侧
- 与文字 `PromptClip` 同行
- 整组透明度约 `0.75`
- 图片本身透明度：
  - minimal / pastel：`0.55`
  - dark：`0.70`，并使用浅色或反色版本

## 图片生成

iOS 推荐实现方式：

- SwiftUI：用 `ImageRenderer` 将分享卡片视图渲染为 `UIImage`
- UIKit：用 `UIGraphicsImageRenderer`

要求：

- 生成前确保 logo 图片已加载。
- 输出 PNG 宽度固定为 `800px`。
- 高度由卡片内容测量得到。
- 生成失败要显示明确错误，不允许静默失败。

SwiftUI 伪代码：

```swift
let view = ShareCardView(
    prompt: prompt,
    authorName: config.shareAuthorName,
    template: selectedTemplate,
    options: options
)
.frame(width: 800)

let renderer = ImageRenderer(content: view)
renderer.scale = 1
let image = renderer.uiImage
```

注意：不要使用 `UIScreen.main.scale = 2/3` 直接生成 1600 或 2400 宽图片。该功能要求最终 PNG 宽度为 `800px`。

## 保存、复制、分享

### 保存到相册

- 使用 PhotoKit 或 `UIImageWriteToSavedPhotosAlbum`
- 需要处理相册权限
- 成功提示：`图片已保存`
- 失败提示：`保存图片失败`

### 复制图片

- 使用 `UIPasteboard.general.image = image`
- 成功提示：`图片已复制`
- 失败提示：`复制图片失败`

### 系统分享

- 使用 `UIActivityViewController`
- 分享对象为生成后的 PNG/UIImage

iOS 端建议同时提供三个操作：

- `保存图片`
- `复制图片`
- `分享`

Web 端有“下载图片”和“复制图片”，iOS 端用平台原生动作替代“下载”。

## 设置页

设置项：

- 标题：
  - 简体中文：`分享作者`
  - 繁体中文：`分享作者`
  - 英文：`Share author`
- 描述：
  - 简体中文：`用于分享图片左上角的作者名称。留空时不会显示作者信息。`
  - 繁体中文：`用於分享圖片左上角的作者名稱。留空時不會顯示作者資訊。`
  - 英文：`Author name shown in the top-left corner of share images. Leave it empty to hide author info.`

保存行为：

- 用户点击保存设置时，写入 `.promptclip.json` 的 `shareAuthorName`。
- 读取工作区时，从 `.promptclip.json` 恢复。
- “恢复默认设置”应清空作者名称。

## 多语言文案

至少需要以下 key：

```text
sharePrompt
shareImageTitle
shareTemplate
shareOptions
showAuthorInfo
showPromptClipLogo
showPromptTags
renderMarkdown
shareRightClickHint / iOS 可替换为预览说明
saveImage
copyImage
systemShare
generatingImage
shareImageSaved
shareImageCopied
shareImageGenerateFailed
shareImageCopyFailed
shareContentTruncated
shareAuthorTitle
shareAuthorDescription
shareAuthorPlaceholder
```

简体中文建议：

```text
分享
生成分享图片
卡片模板
分享选项
显示作者信息
显示 PromptClip 标志
显示笔记中的标签
渲染 Markdown
保存图片
复制图片
分享
生成中...
图片已保存
图片已复制
生成分享图片失败
复制图片失败
内容已截断至 2000 字符。
分享作者
用于分享图片左上角的作者名称。留空时不会显示作者信息。
输入作者名称
```

## 验收标准

- 从单条笔记可以进入分享面板。
- 分享面板默认展示当前笔记的图片预览。
- 可以切换 3 种模板。
- 可以切换作者、logo、标签、Markdown 渲染。
- 分享内容默认使用 Markdown 渲染。
- 关闭 Markdown 渲染后，显示原始纯文本并保留换行。
- 超过 2000 字符的正文被截断，并显示截断提示。
- 输出 PNG 宽度为 `800px`。
- 长标题、长代码块、长 URL 不溢出。
- 作者名称保存到 `.promptclip.json`，重启或刷新后仍存在。
- 作者名称为空时，即使开启“显示作者信息”，卡片也不显示作者行。
- 保存、复制、系统分享动作可用。
- 失败时有明确错误提示。
- 简体中文、繁体中文、英文文案完整。

## 测试建议

### 单元测试

- 配置读写：
  - 缺失 `shareAuthorName` 返回空字符串
  - 非字符串返回空字符串
  - 字符串读取时 trim
  - 保存作者名称时保留 `historyVersions` 和 `pinnedTags`

- 内容截断：
  - 2000 字符以内不截断
  - 2001 字符截断到 2000 并标记 `isTruncated`

- 模板：
  - 3 个模板 ID 完整
  - 默认模板为 `minimal`

### UI 测试

- 分享入口存在。
- 分享面板默认选项正确。
- 切换选项后预览显示/隐藏对应内容。
- 作者名为空时不显示作者行。
- Markdown/纯文本切换有效。
- 生成图片宽度为 800。

### 手动验证

- 长标题换行。
- 代码块长行换行。
- 深色模板 logo 可见。
- 保存到相册后图片内容非空白。
- 复制到剪贴板后可粘贴到其他 App。
- 系统分享面板可打开。

## iOS 实现注意事项

- 图片生成视图应与屏幕预览视图分离：预览可以缩放适配屏幕，导出视图必须固定 800 宽。
- 不要把导出视图放在会影响当前 UI 布局的位置。
- 如果使用 SwiftUI `ImageRenderer`，确认渲染出的图片非空白，并检查最终像素宽度。
- Markdown 渲染失败时回退纯文本。
- 工作区配置是跨端共享契约，字段名必须使用 `shareAuthorName`。
- 不要把分享作者名称只存在 UserDefaults。
- 不要在导出图中显示 Web 参考图里的日期、天数、统计、flomo 标志。

## 与 Web 端最终差异

Web 端动作：

- 下载 PNG
- 复制图片
- 右键保存预览

iOS 端动作建议：

- 保存图片到相册
- 复制图片
- 系统分享

除平台动作差异外，数据、模板、字号、截断、选项和配置文件行为应保持一致。
