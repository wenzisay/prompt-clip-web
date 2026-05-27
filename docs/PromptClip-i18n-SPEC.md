# PromptClip 多语言规格说明

> 本文档总结 Web 版已实现的多语言机制，用于指导 iOS 版实现。Web 参考实现位于 `src/i18n/` 与 `src/stores/settingsStore.ts`。

## 1. 目标

- 支持简体中文与英文两种界面语言。
- 首次使用时自动检测系统语言。
- 用户可在设置中手动切换语言。
- 用户手动选择后，后续启动应优先使用已保存的语言设置。
- 所有用户可见 UI 文案、按钮、提示、空状态、错误兜底文案应从统一语言资源读取。

## 2. 支持语言

| 语言 | Locale ID | 显示名称 |
| --- | --- | --- |
| 简体中文 | `zh-CN` | 中文 |
| 英文 | `en-US` | English |

默认兜底语言为 `en-US`。

## 3. 首次语言检测规则

当没有已保存语言配置时，应用应读取系统首选语言列表。

### 3.1 Web 版规则

Web 版读取：

- `navigator.languages`
- 如果 `navigator.languages` 为空，则读取 `navigator.language`

检测逻辑：

- 命中以下任一语言时使用 `zh-CN`：
  - `zh-CN`
  - `zh-Hans`
  - `zh-Hans-*`
  - `zh-SG`
- 其他语言统一使用 `en-US`
  - 例如：`en-US`、`ja-JP`、`ko-KR`、`fr-FR`
  - 繁体中文如 `zh-TW`、`zh-HK`、`zh-Hant` 也使用 `en-US`

### 3.2 iOS 建议规则

iOS 版应读取系统 preferred localizations，例如：

- SwiftUI / Foundation: `Locale.preferredLanguages`
- 或使用 Bundle localization resolution 结果

推荐实现等价逻辑：

```swift
enum AppLocale: String, CaseIterable, Codable {
  case zhCN = "zh-CN"
  case enUS = "en-US"
}

func detectInitialLocale(preferredLanguages: [String]) -> AppLocale {
  let normalized = preferredLanguages.map { $0.lowercased() }
  let hasSimplifiedChinese = normalized.contains { language in
    language == "zh-cn"
      || language == "zh-hans"
      || language.hasPrefix("zh-hans-")
      || language == "zh-sg"
  }

  return hasSimplifiedChinese ? .zhCN : .enUS
}
```

## 4. 持久化策略

### 4.1 Web 版

Web 版使用 Zustand persist，将 `locale` 保存到 `localStorage`：

- key: `promptclip-settings`
- 仅持久化 `locale`
- 工作区级历史版本设置不与语言偏好耦合

语言切换是全局应用偏好，不是某个 Prompt 文件夹的配置，因此不写入 `.promptclip.json`。

### 4.2 iOS 建议

iOS 版建议使用 `UserDefaults` 保存：

- key: `promptclip.locale`
- value: `zh-CN` 或 `en-US`

启动流程：

1. 尝试读取 `UserDefaults["promptclip.locale"]`
2. 如果存在且合法，直接使用
3. 如果不存在，执行首次语言检测
4. 将检测结果作为当前语言，可选择立即写入 UserDefaults，也可等用户手动选择后再写入

推荐：首次检测结果可以写入 UserDefaults，便于后续启动稳定一致；设置页切换时必须写入。

## 5. 设置页交互

设置页通用设置中提供语言切换控件。

### 5.1 Web 版行为

- 位置：设置弹窗 → 通用设置 → 语言
- 控件：`select`
- 选项：
  - `zh-CN`: 中文
  - `en-US`: English
- 切换后立即生效，无需点击保存
- 历史版本等工作区设置仍需点击保存

### 5.2 iOS 建议

SwiftUI 中建议使用 `Picker`：

```swift
Picker("Language", selection: $settings.locale) {
  Text("中文").tag(AppLocale.zhCN)
  Text("English").tag(AppLocale.enUS)
}
```

切换后：

- 立即更新应用内文案
- 写入 `UserDefaults`
- 不要求重启应用

## 6. 文案资源结构

Web 版使用轻量字典，而不是引入大型 i18n 框架。

```text
src/i18n/
├── index.ts
├── messages.ts
├── types.ts
└── useTranslation.ts
```

核心结构：

```ts
type Locale = 'zh-CN' | 'en-US';

messages = {
  'zh-CN': {
    common: { ... },
    app: { ... },
    settings: { ... },
    metadataFields: { ... },
  },
  'en-US': {
    common: { ... },
    app: { ... },
    settings: { ... },
    metadataFields: { ... },
  },
}
```

### 6.1 命名空间

| Namespace | 内容 |
| --- | --- |
| `common` | 通用按钮和短文案，例如取消 |
| `app` | 主应用 UI、欢迎页、详情页、编辑页、导出、命令面板、空状态 |
| `settings` | 设置页专用文案 |
| `metadataFields` | frontmatter 字段展示名 |

### 6.2 动态文案

带变量的文案使用函数，不拼接字符串。

示例：

```ts
characterCount: (count: number) => `${count} 字符`
usageCount: (count: number) => `使用 ${count} 次`
batchDeleteConfirm: (count: number) =>
  `确定要将 ${count} 个 Prompt 移动到 .trash 吗？`
```

iOS 版可以使用：

- 简单项目：Swift 字典 + 函数
- 更系统化：`.xcstrings` String Catalog + `String.localizedStringWithFormat`

由于当前只支持两种语言且有较多函数型文案，iOS 初版可以先采用强类型 `I18n` 结构，后续再迁移到 String Catalog。

## 7. 应用接入方式

### 7.1 Web 版

组件通过 `useTranslation()` 获取当前语言与字典：

```ts
const { locale, t } = useTranslation();
```

渲染文案：

```tsx
<button>{t.app.save}</button>
<span>{t.app.characterCount(count)}</span>
```

应用根组件同步 HTML 语言：

```ts
document.documentElement.lang = locale === 'zh-CN' ? 'zh-Hans' : 'en';
```

### 7.2 iOS 建议

建议增加一个全局设置模型：

```swift
@Observable
final class AppSettings {
  var locale: AppLocale {
    didSet {
      UserDefaults.standard.set(locale.rawValue, forKey: "promptclip.locale")
    }
  }
}
```

SwiftUI 根视图注入：

```swift
@main
struct PromptClipApp: App {
  @State private var settings = AppSettings.load()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environment(settings)
    }
  }
}
```

视图中读取：

```swift
@Environment(AppSettings.self) private var settings

Text(I18n.text(for: settings.locale).app.save)
```

## 8. 已覆盖的 Web UI 范围

Web 版当前已覆盖：

- 设置页
- 欢迎页
- 侧边栏与标签树
- 顶部搜索栏
- 筛选 Tabs
- Prompt 卡片菜单
- 详情页
- 创建/编辑页
- Markdown 模式切换
- 历史版本弹窗
- 删除确认
- PromptGrid 空状态与批量操作
- 导出弹窗
- 命令面板
- 通用 Modal / SideDrawer 的关闭与尺寸调整可访问文案
- 目录选择与 Prompt 加载的兜底错误文案

非目标：

- 不翻译用户自己的 Prompt 标题、内容、标签。
- 不翻译 Markdown 文件中的 frontmatter 原始字段名。
- 不翻译开发者 console 日志。

## 9. 测试要求

Web 版测试覆盖：

- `detectInitialLocale`：
  - 简体中文返回 `zh-CN`
  - 英文/其他语言返回 `en-US`
  - `zh-TW` 返回 `en-US`
- settings store：
  - 切换语言不会重置历史版本设置
- 文案字典：
  - 英文主界面、详情页、编辑页关键文案存在
- 设置页：
  - 中文渲染
  - 英文渲染
  - 语言选择控件存在

iOS 版建议补充：

- Locale detection unit tests
- UserDefaults persistence tests
- Settings Picker interaction tests
- 至少覆盖主界面、详情页、编辑页、设置页的快照或 UI 测试

## 10. iOS 实施清单

1. 定义 `AppLocale`
2. 实现 `detectInitialLocale(preferredLanguages:)`
3. 定义 `AppSettings` 并持久化 `locale`
4. 建立 `I18n` 文案结构，先覆盖 Web 已有 namespace
5. 在设置页增加语言 `Picker`
6. 将所有用户可见硬编码文案替换为 `I18n`
7. 处理动态文案函数，例如字符数、使用次数、导出数量
8. 补测试，确保首次语言检测与手动切换行为稳定

## 11. 兼容与迁移注意事项

- 语言偏好是应用级偏好，不应写入 Prompt 文件夹配置。
- 如果未来支持更多语言，应扩展 `Locale` / `AppLocale` 枚举，并保持英文为兜底。
- 如果未来需要繁体中文，应新增 `zh-Hant` 或具体地区 locale，不要把 `zh-TW` 自动映射到简体中文。
- UI 布局需预留英文长文案空间，尤其是按钮、菜单、设置页说明和空状态。
- iOS 版不应依赖系统自动 LocalizedStringKey 解析全部文案；需要确保应用内手动切换语言时立即生效。
