# Spec: Markdown Live Preview 编辑器

把 Prompt 与 Skill 的 Markdown 编辑从「源码 / 只读预览」切换，升级为 Obsidian 式 Live Preview（光标所在行显示源码、其它行渲染），并提供格式工具栏与 `/` 斜杠插入，同时保留纯源码模式。

## Objective

编辑 Prompt 正文与 Skill 文本 Markdown 时，默认即可边写边看渲染效果；插入标题、列表、加粗等常用格式不必手打语法；需要时可一键切回纯源码。文档始终以 Markdown 字符串为唯一真相，读写往返无损。

## Acceptance Criteria

1. **共享编辑器**：Prompt 编辑（`PromptMarkdownEditorField`）与 Skill Markdown 文本编辑（`SkillFileEditor` 中 `entry.isMarkdown`）共用同一 Live Preview 编辑组件；非 Markdown 文本文件与 HTML 预览行为不变。
2. **Live Preview 默认**：打开编辑区默认进入 Live Preview。光标（及选区）所在行显示 Markdown 源码；其它行按现有 prose / `prompt-detail-content` 视觉风格渲染常见语法（标题、段落、加粗/斜体、行内代码、代码块、链接、无序/有序列表、引用、分隔线、任务列表）。
3. **纯源码模式**：保留可切换的纯源码视图（等宽、完整语法可见），与现有「编辑」语义对齐；模式切换不丢内容、不丢光标位置（尽力保持）。
4. **格式工具栏**：Live Preview 与纯源码模式下均提供工具栏，至少支持：标题（H1–H3）、加粗、斜体、行内代码、链接、无序/有序列表、引用、代码块、任务列表。操作结果写入 Markdown 源码（插入或包裹选区），不引入专有二进制格式。
5. **`/` 斜杠插入**：在行首或空闲位置输入 `/` 弹出命令菜单，可用键盘上下选择与 Enter 确认、Esc 关闭；至少覆盖工具栏同等能力（插入对应 Markdown 片段）。菜单关闭后不残留孤立的 `/`（确认插入时替换触发符；取消则按产品约定处理，见假设）。
6. **数据契约不变**：对外仍是 `value: string` + `onChange(string)`；保存、字数统计、脏检查、全屏编辑、disabled 行为与现有一致。
7. **Skill frontmatter**：Skill Markdown 若含 YAML frontmatter，Live Preview 中 frontmatter 区域始终以源码/等宽展示（不渲染成 prose）；正文区域走 Live Preview。保存时 frontmatter + body 仍是一份完整文件内容。
8. **包体与加载**：编辑器相关新依赖允许引入，但须可按路由/弹层懒加载；不把编辑器打进首屏必要包。`npm run build` 通过；新增依赖须在 PR 说明体积影响（gzip 量级即可）。
9. **性能体验**：在约 2 万字符的常见 Prompt 上，键入无明显卡顿（主观可接受；实现阶段用真实内容手测）。大文档不做虚拟滚动亦可，但不得因装饰层导致每次按键全量重解析页面崩溃。
10. **无障碍与键盘**：工具栏按钮有可访问名称；斜杠菜单支持键盘操作；编辑区保留可读的 `aria-label`（沿用现有文案键）。
11. **i18n**：工具栏、斜杠菜单、模式切换等新增用户可见文案提供 `zh-CN`、`zh-TW`、`en-US`、`ja-JP` 四种翻译。
12. **回归**：现有 Prompt 详情只读预览、Skill HTML sandbox 预览、非文本文件下载路径不受影响；相关既有测试更新后仍绿。

## Non-Goals

- 不做 wiki 链接、双链图谱、插件生态、块引用、嵌入笔记。
- 不做表格编辑器、数学公式可视化编辑、Mermaid 所见即所得（源码中写表格/公式可保留为源码显示；首版可不渲染复杂块，但不得破坏源码）。
- 不做协作光标、评论、版本 diff 内嵌。
- 不改 iOS 仓库（`prompt-clip-ios`）；不改 Prompt/Skill 存储格式或后端命令。
- 不把文档模型改成 ProseMirror/TipTap AST 作为真相源。
- 不做主题市场或与 Obsidian 主题兼容。

## Tech Stack

- 现有：React 18 + TypeScript + Vite + Zustand 5 + Tailwind 3.4 + `marked` + Tauri 2
- 新增方向（已定）：**CodeMirror 6 + Live Preview 装饰层**；工具栏与 `/` 通过插入 Markdown 片段实现（可用 CM6 autocomplete / 自定义面板）
- Live Preview 实现可选成熟薄封装（如 `@fedoup/markdown-editor`、Silkdown 一类 CM6 装饰方案）或等价自研装饰；**不得**为做斜杠而换成 ProseMirror 主栈
- 测试：Vitest 2 + Testing Library

## Commands

```bash
npm run test -- --run
npm run type-check
npm run lint
npm run build
```

## Design Notes（What 级）

### 技术方案

- 以 Markdown 字符串为唯一文档模型；CM6 编辑状态与父组件受控 `value`/`onChange` 同步（防抖或等价策略由实现决定，但不得造成保存内容滞后于用户可见文本）。
- 抽出共享组件（建议名 `MarkdownLiveEditor` 或同等），替换：
  - Prompt：`PromptMarkdownEditorField` 内 textarea + `MarkdownPreviewEditor` 双态
  - Skill：`SkillFileEditor` 中 Markdown 的 textarea / 只读预览双态（HTML 分支保留）
- 现有 `MarkdownModeToggle` 语义演进为「Live Preview | 源码」（文案可调整）；只读「预览」若仍被详情页使用则保留只读组件，不与编辑器混用。
- 斜杠菜单与工具栏只产生标准 CommonMark/GFM 子集语法，与当前 `marked` 渲染能力对齐的优先。

### UI/UX

- 工具栏位置：编辑区上方或模式切换同一行附近，不遮挡内容；全屏模式下仍可用。
- 斜杠菜单：紧贴光标，选项少而清晰；无匹配时可提示并允许 Esc 退出。
- 视觉：渲染块尽量复用 `prompt-detail-content` / 现有 prose 样式，避免两套 Markdown 皮肤。

## Boundaries

- **Always**：Markdown 字符串往返无损；新依赖懒加载；四语言文案齐全；改编辑器不改存储 API。
- **Ask first**：换成 ProseMirror/TipTap 主栈；引入明显更重的编辑器框架；改变 Skill frontmatter 的文件布局约定；扩大语法范围到表格可视化等非目标项。
- **Never**：把未渲染的专有 JSON/二进制当正文存储；在实现中静默删减已承诺的 B 档能力；为过测试而禁用既有用例。

## Assumptions

1. 范围仅 `prompt-clip-web`（桌面/网页）；iOS 另议。
2. Prompt 与 Skill Markdown 共用同一编辑器组件。
3. 常用 Markdown 子集即可；不做 Obsidian 插件级语法。
4. 新依赖可接受，前提是轻量且可懒加载。
5. 斜杠确认插入时，触发用的 `/`（及后续查询字符）被替换为插入内容；Esc 取消时删除触发 `/` 或保留由实现选一致、可测的行为并在 PR 写明。
6. `bundleOptimization` 类测试关注的是懒加载与 sourcemap 策略，不是编辑器硬性 KB 上限；PR 仍需注明新增包体积影响。

## Testing Strategy

- 组件：模式切换不丢内容；工具栏包裹/插入选区；`/` 打开/选择/Esc；受控 `onChange` 收到预期 Markdown。
- 集成：Prompt 编辑保存链路、Skill Markdown 保存与 dirty；frontmatter 不被 prose 吃掉。
- 构建：`type-check` / `lint` / `build`；确认编辑器 chunk 非首屏强制同步加载（抽查 build 产物或现有优化测试惯例）。
- 手工：2 万字左右真实 Prompt 键入手感；全屏；暗色/现有主题下对比度。

## Open Questions

- 无阻塞项。下列实现细节可在 Plan/PR 内决定并写回决策记录：具体 npm 包选型（CM6 Live Preview 封装）、斜杠 Esc 后是否保留 `/`、工具栏图标风格（Material Symbols 与现网一致即可）。

## Decision Log

> **Q：** 交互形态？  
> **A：** Obsidian 式 Live Preview（光标行源码 + 可切纯源码）。

> **Q：** 首版能力档？  
> **A：** B = Live Preview + 格式工具栏 + `/` 斜杠插入。

> **Q：** 技术路线？  
> **A：** CodeMirror 6 + Live Preview 装饰层；工具栏与斜杠插入 Markdown（不采用 Milkdown/TipTap 作主栈；不首版自研薄 CM6）。

> **Q：** 具体 npm 包？  
> **A：** `@silkdown/*` 在 npm 不可用；采用 `@fedoup/markdown-editor` 的 CM6 Live Preview 装饰思路，并在仓库内 vendored `livePreview` 节点装饰以支持 Skill frontmatter 保护行。文档仍为 Markdown 字符串。

> **Q：** 仓库与共用？  
> **A：** 仅 web；Prompt/Skill 共用；常用 MD 子集；允许轻量新依赖。

## Reference

- 现状：`src/components/prompt/PromptMarkdownEditorField.tsx`、`MarkdownPreviewEditor.tsx`、`MarkdownModeToggle.tsx`
- Skill：`src/components/skill/SkillFileEditor.tsx`
- 渲染：`src/utils/markdown.ts`、`PromptContent`
- 仓库：https://github.com/wenzisay/prompt-clip-web
