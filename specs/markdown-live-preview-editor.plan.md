# Plan: Markdown Live Preview 编辑器

**目标：** 用 CodeMirror 6 + Live Preview 装饰层，把 Prompt/Skill Markdown 编辑升到 B 档（Live Preview + 工具栏 + `/` 斜杠），文档仍是纯 Markdown 字符串。  
**架构：** 抽出共享 `MarkdownLiveEditor`（CM6 + `@silkdown/*` Live Preview）；工具栏与斜杠只插入/包裹 Markdown；Prompt 与 Skill 接入；编辑器 chunk 动态 import，不进首屏。  
**技术 / 命令：** `npm run test -- --run` · `npm run type-check` · `npm run lint` · `npm run build`  
**规格：** `specs/markdown-live-preview-editor.md`（已批准）

## 范围

**包含：**
- 共享 Live Preview 编辑器（默认 Live Preview，可切纯源码）
- 格式工具栏与 `/` 斜杠插入（Markdown 片段）
- Prompt 编辑与 Skill Markdown 文本编辑接入
- 四语言文案、懒加载、既有测试更新

**不包含：**
- iOS、wiki/双链、表格可视化、ProseMirror 主栈、发版公告

## 成功标准

- Prompt / Skill Markdown 默认可 Live Preview 编辑，且可切纯源码不丢内容
- 工具栏与 `/` 能插入 SPEC 所列语法，`onChange` 收到标准 Markdown
- Skill frontmatter 等宽不渲染；HTML/非文本路径不变
- `type-check` / `lint` / 相关测试 / `build` 通过；编辑器不进首屏主包

## 全局约束

- Markdown 字符串为唯一真相；禁止 AST 作存储模型
- 新依赖允许，必须可懒加载；PR 注明 gzip 体积影响
- 用户可见文案四语言（`zh-CN` / `zh-TW` / `en-US` / `ja-JP`）
- Material Symbols 新图标须跑 `bash scripts/subset-material-symbols.sh` 并提交字体产物
- 依赖方向遵守 AGENTS.md；命名导出 + `@/` 别名

## 假设

1. Live Preview 优先采用 **`@silkdown/react` + `@silkdown/core`**（CM6 装饰、受控、Obsidian 形态）。若安装/兼容失败，回退 `@fedoup/markdown-editor` 或等价 CM6 装饰方案，**不得**改走 TipTap/Milkdown。
2. 斜杠 Esc：删除触发用的 `/` 及已输入查询字符（可测、一致）。
3. 模式枚举从 `'text' | 'preview'` 演进为 `'source' | 'live'`（或保留内部值但 UI 文案改为「源码 / Live」）；只读详情预览组件继续用 `MarkdownPreviewEditor` / `PromptContent`，不与编辑器混用。
4. `MarkdownPreviewEditor` 可暂留供只读场景；编辑路径不再依赖「只读 preview 当编辑态」。

## 评审焦点

| 失败模式 | 期望 | 任务 |
|----------|------|------|
| 受控 `value` 外部更新丢光标/撤销栈 | 文档同步且尽量保 selection | 1 |
| 工具栏/斜杠写出非标准或半截语法 | 插入完整可解析片段 | 2 |
| Skill frontmatter 被 prose 吃掉 | `---` 块始终等宽源码 | 4 |
| CM6 进首屏 vendor | 动态 import，build 产物可辨 | 5 |
| 模式切换丢字 | 同一 CM6 实例或同源字符串无损切换 | 1、3 |

## 文件 / 接口地图

**新建**
- `src/components/markdown/MarkdownLiveEditor.tsx` — 共享编辑器壳
- `src/components/markdown/MarkdownFormatToolbar.tsx` — 工具栏
- `src/components/markdown/markdownSlashCommands.ts` — 斜杠命令定义与插入纯函数
- `src/components/markdown/markdownInsert.ts` — 选区包裹/插入 Markdown 纯函数（供工具栏与斜杠复用）
- `src/components/markdown/index.ts` — barrel
- 同目录 `*.test.ts(x)`

**修改**
- `src/components/prompt/PromptMarkdownEditorField.tsx` — 接入共享编辑器；模式语义
- `src/components/prompt/MarkdownModeToggle.tsx` (+ test) — Live / 源码
- `src/components/prompt/PromptMarkdownEditorField.test.tsx`
- `src/components/skill/SkillFileEditor.tsx` (+ test) — Markdown 路径接入；frontmatter
- `src/i18n/messages.ts` — 新文案四语言
- `package.json` / lock — `@silkdown/react`、`@silkdown/core`、CM6 peers
- `vite.config.ts`（仅当需要显式 vendor chunk 名时；默认靠动态 import 即可）
- `scripts/icon-glyphs.txt` + `public/fonts/material-symbols-outlined.woff2`（若新增图标）

**接口（产出供后续消费）**

```ts
export type MarkdownEditorMode = 'live' | 'source';

export interface MarkdownLiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: MarkdownEditorMode;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  /** Skill：frontmatter 行范围始终源码展示；默认无 */
  protectFrontmatter?: boolean;
}

export type MarkdownInsertCommandId =
  | 'h1' | 'h2' | 'h3'
  | 'bold' | 'italic' | 'inlineCode' | 'link'
  | 'ul' | 'ol' | 'quote' | 'codeBlock' | 'task';

export function applyMarkdownInsert(
  value: string,
  selection: { from: number; to: number },
  command: MarkdownInsertCommandId
): { value: string; selection: { from: number; to: number } };

export const MARKDOWN_SLASH_COMMANDS: Array<{
  id: MarkdownInsertCommandId;
  /** i18n key under messages */
  labelKey: string;
}>;
```

## 行动项

### 阶段 1：共享编辑器内核

#### 任务 1：CM6 + Silkdown 共享壳（Live / 源码）

**说明：** 安装依赖；实现受控 `MarkdownLiveEditor`：默认 Live Preview，`mode==='source'` 时关闭装饰；`disabled` 只读；对外仍是 string。

**文件：**
- 新建：`src/components/markdown/MarkdownLiveEditor.tsx`、`MarkdownLiveEditor.test.tsx`、`index.ts`
- 修改：`package.json`、lockfile

**接口：**
- 产出：`MarkdownLiveEditor`、`MarkdownEditorMode`、`MarkdownLiveEditorProps`

**验收标准：**
- [ ] 键入触发 `onChange`，内容为完整 Markdown 字符串
- [ ] `mode` 在 live/source 间切换不丢文档内容
- [ ] Live 下非光标行隐藏常见标记（至少加粗/标题可测或可手工确认）
- [ ] 外部改 `value` 能反映到编辑器且不整树无故重置（尽力保光标）

**验证：**
- [ ] `npm run test -- --run src/components/markdown/MarkdownLiveEditor.test.tsx`
- [ ] `npm run type-check`
- [ ] 手工：`npm run dev` 临时挂载，输入 `**a**` 移开光标看渲染

**依赖：** 无  
**体量：** M  
**风险：** 高（选型与受控同步）— 失败则按假设回退包装，不换主栈

**步骤：**
- [ ] `npm install @silkdown/react @silkdown/core` 及文档要求的 CM6 peer
- [ ] 实现受控壳 + sourceMode/live 切换
- [ ] 写组件测试（onChange、mode 切换保内容）
- [ ] 提交

#### 任务 2：插入纯函数 + 格式工具栏 + `/` 斜杠

**说明：** 纯函数生成 Markdown 补丁；工具栏按钮与斜杠菜单共用；斜杠在 `/` 触发，键盘上下/Enter/Esc。

**文件：**
- 新建：`markdownInsert.ts`、`markdownSlashCommands.ts`、`MarkdownFormatToolbar.tsx` 及对应测试
- 修改：`MarkdownLiveEditor.tsx`（挂载工具栏、注册斜杠 autocomplete/面板）、`messages.ts`（命令文案可先加）

**接口：**
- 产出：`applyMarkdownInsert`、`MARKDOWN_SLASH_COMMANDS`、`MarkdownFormatToolbar`
- 消费：任务 1 的编辑器 view/dispatch 能力（通过 props 回调或 ref：`getSelection` / `replaceSelection`）

**验收标准：**
- [ ] SPEC 所列命令均能插入正确片段（单测覆盖 `applyMarkdownInsert`）
- [ ] 工具栏按钮有 `aria-label`；点击后 `onChange` 更新
- [ ] `/` 打开菜单；Enter 插入并去掉触发符；Esc 去掉 `/`（及查询串）
- [ ] 源码与 Live 模式均可触发

**验证：**
- [ ] `npm run test -- --run src/components/markdown/`
- [ ] 手工：斜杠选「加粗」、工具栏点「列表」

**依赖：** 任务 1  
**体量：** M  
**风险：** 中（CM6 斜杠 UX）

#### 检查点：任务 1–2 之后
- [ ] markdown 目录测试通过
- [ ] type-check 通过
- [ ] 独立 demo/临时页可 Live 编辑 + 工具栏 + 斜杠
- [ ] 人可扫一眼交互再继续接入

---

### 阶段 2：产品接入

#### 任务 3：接入 Prompt 编辑路径

**说明：** `PromptMarkdownEditorField` 用懒加载的 `MarkdownLiveEditor` 替换 textarea/只读 preview 双态；模式切换改为 Live/源码；保留全屏与字数。

**文件：**
- 修改：`PromptMarkdownEditorField.tsx`、`MarkdownModeToggle.tsx`、二者测试、`messages.ts`（`sourceMode`/`previewMode`/`toggleMarkdownMode` 等文案）
- 视需要改调用方默认 mode（Create/Edit Modal 等）

**验收标准：**
- [ ] 创建/编辑 Prompt 默认 Live Preview
- [ ] 可切源码；全屏仍可用工具栏/斜杠
- [ ] 字数统计仍正确；disabled 时不可编
- [ ] 更新后的 `PromptMarkdownEditorField.test.tsx` / `MarkdownModeToggle.test.tsx` 通过

**验证：**
- [ ] `npm run test -- --run src/components/prompt/PromptMarkdownEditorField.test.tsx src/components/prompt/MarkdownModeToggle.test.tsx`
- [ ] 手工：新建 Prompt，写标题/列表，保存再打开内容一致

**依赖：** 任务 2  
**体量：** M

#### 任务 4：接入 Skill Markdown + frontmatter

**说明：** `SkillFileEditor` 在 `entry.isMarkdown` 时用同一懒加载编辑器；`protectFrontmatter`；非 MD 文本与 HTML preview 不变。

**文件：**
- 修改：`SkillFileEditor.tsx`、`SkillFileEditor.test.tsx`

**验收标准：**
- [ ] Markdown 文件 Live 编辑；保存/dirty 行为与现有一致
- [ ] 含 frontmatter 时顶部 `---` 块保持等宽源码
- [ ] HTML iframe preview、二进制下载路径无回归
- [ ] 相关测试更新后通过

**验证：**
- [ ] `npm run test -- --run src/components/skill/SkillFileEditor.test.tsx`
- [ ] 手工：打开带 frontmatter 的 SKILL.md，改正文，frontmatter 仍在

**依赖：** 任务 2（可与任务 3 并行）  
**体量：** M

#### 检查点：任务 3–4 之后
- [ ] Prompt + Skill 主路径手测通过
- [ ] 聚焦测试通过
- [ ] 人审 UI 文案与模式命名

---

### 阶段 3：工程收尾

#### 任务 5：懒加载、图标子集、回归与体积说明

**说明：** 确保 CM6/Silkdown 仅经 `import()` 进入编辑入口；新 Material 图标跑子集脚本；全量相关回归；PR 写 gzip 影响。

**文件：**
- 修改：接入处的动态 import（若任务 3/4 未做完则补齐）、`vite.config.ts`（可选 vendor 名）、图标脚本产物、必要时 `CHANGELOG.md`（仅当仓库惯例要求）

**验收标准：**
- [ ] `npm run build` 成功；主 chunk 未因本次把 CM6 静态打进首屏（查 bundle 分析或 chunk 文件名）
- [ ] 新图标经 `bash scripts/subset-material-symbols.sh` + `src/iconFontAssets.test.ts` 与 verify-subset
- [ ] `npm run lint`、`npm run test -- --run`、`npm run type-check` 全绿
- [ ] PR 描述含依赖列表与体积说明

**验证：**
- [ ] `npm run type-check && npm run lint && npm run test -- --run && npm run build`
- [ ] 若有新图标：`npm run test -- --run src/iconFontAssets.test.ts` + verify-subset 命令（见 AGENTS.md）

**依赖：** 任务 3、4  
**体量：** S–M  
**风险：** 中（包体）

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| Silkdown 与 React 18 / Vite 6 不兼容 | 高 | 任务 1 尽早验证；回退 `@fedoup/markdown-editor` |
| CM6 受控同步打架 | 中 | 跟官方受控示例；测外部 value 更新 |
| 斜杠与 IME 中文输入冲突 | 中 | 仅在 ASCII `/` 且非 composing 时触发 |
| 测试环境 jsdom 对 CM6 弱 | 中 | 纯函数单测为主；组件测 onChange/模式；关键交互手工 |

## 未决问题

- 无阻塞。实现时选定的具体包版本与 Esc 行为写回 SPEC「决策记录」。

## 执行注意（给人 / Agent）

- **批准本 Plan 前不写业务代码。**
- 落地走 Cloud Agent / PR；先提交 `specs/markdown-live-preview-editor.md` 与本 Plan，再按任务开实现 PR（可同一 PR 分 commit）。
- 每任务保持可构建；高风险任务 1 失败先停，换回退方案并更新本 Plan 假设。
