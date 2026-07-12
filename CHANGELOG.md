# Changelog

本项目所有重要变更均会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，并遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.2] - 2026-07-12

### Added

- **全局快速搜索（桌面端）**：新增可从任意应用通过全局快捷键（默认 `Ctrl/Cmd + Shift + Space`）呼出的浮动搜索窗。搜索 Prompt 后可直接「粘贴到光标处」或「在主窗口打开」；浮动窗体无标题栏、始终置顶，并自动在鼠标所在显示器居中显示，贴近当前操作焦点。桌面端新增 Tauri 插件 `clipboard-manager`、`global-shortcut`，以及 Rust 依赖 `arboard`（剪贴板）、`enigo`（输入模拟）、`tokio`。
- **快速搜索设置面板**：设置中新增「快速搜索」分区，可开关全局搜索、录入自定义快捷键（含录入失败提示与恢复默认）。该分区仅在桌面端显示，Web 端自动隐藏。
- **macOS 辅助功能权限自动刷新**：自动粘贴依赖辅助功能权限；窗口重新聚焦（如从系统设置返回）时自动重新检测权限状态，无需重启应用。
- **国际化**：快速搜索相关界面文案补齐四种语言（zh-CN / zh-TW / en-US / ja-JP）。

## [1.0.1] - 2026-06-28

### Added

- **分享图支持批注**：可在分享卡片中选择性包含 Prompt 批注（文字与图片附件）。新增「包含批注」开关，逐条勾选（默认全选），选中的批注渲染在正文下方，以「Note」细线分隔。
- **支持页**：新增双语（中 / 英）支持 / 帮助页面。

### Changed

- **图标字体体积优化**：将 Material Symbols 图标字体从完整的 1.1MB 子集化为约 12KB，仅保留项目实际使用的 58 个图标（并保留全部可变字体轴），显著改善部署后的首屏加载；新增可复现的子集化脚本，自动扫描源码中的图标引用，无需手工维护清单。
- **分享图作者位置**：作者名称从卡片顶部移至底部右侧，紧邻 PromptClip logo；两者同时显示时以细竖线分隔。

### Fixed

- **欢迎页首屏布局**：在网络较慢、图标字体尚未加载完成时，按钮文案与图标不再被 ligature 回退文本挤乱，首屏保持稳定。
- **批注**：处理 Windows 下 Tauri sidecar 缺失导致的报错，批注面板可优雅降级。

## [1.0.0] - 2026-06-19

首个稳定版本。本地优先的 AI 提示词管理工具——数据完全存储在本地，以 `.md` 文件形式，无需注册、无需云端、无需数据库。

### Added

- Prompt 以 `.md` 文件本地存储（YAML frontmatter + Markdown 正文），可被任意工具编辑
- 层级标签系统，可视化标签树（重命名、删除、置顶）
- 加权全文搜索（FlexSearch；标题 +10 / 内容 +5 / 标签 +3），毫秒级响应
- 命令面板（`Cmd / Ctrl + K`），模糊匹配，无匹配时回退全文搜索
- Prompt 批注（文字 + 图片附件），独立存放于 `_promptclip/annotations/`
- 分享图片导出（极简白 / 深色 / 淡彩边框三套模板）为 PNG
- 多格式导出（JSON、CSV、Markdown ZIP），可选导出范围（选中 / 当前筛选 / 全部）
- 可选历史版本，每次编辑自动保存（按保留天数 / 数量清理）
- 回收站（查看、恢复、彻底删除、一键清空），批注 sidecar 一并迁移
- 元数据自愈：为 Obsidian 等外部编辑的 `.md` 一键补全缺失的 frontmatter
- 稳定 ID 迁移：旧文件首次加载自动生成并写回稳定 ID
- 两级懒加载 + 虚拟化列表，适配大型工作区（5K 级别）
- 多语言界面（zh-CN / zh-TW / en-US / ja-JP），按浏览器语言自动探测
- 跨平台：Web、macOS、Linux、Windows 桌面；iOS 移动端

## [0.1.0-beta.7] - 2026-06-18

1.0.0 前的最后一个预发布版本。

> `0.1.0-beta.1` ~ `0.1.0-beta.6`（2026-05-19 ~ 2026-06-18）为更早的迭代预发布版本，逐步形成 1.0.0 的完整功能集。

[Unreleased]: https://github.com/wenzisay/prompt-clip-web/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/wenzisay/prompt-clip-web/releases/tag/v1.0.2
[1.0.1]: https://github.com/wenzisay/prompt-clip-web/releases/tag/v1.0.1
[1.0.0]: https://github.com/wenzisay/prompt-clip-web/releases/tag/v1.0.0
[0.1.0-beta.7]: https://github.com/wenzisay/prompt-clip-web/releases/tag/v0.1.0-beta-7
