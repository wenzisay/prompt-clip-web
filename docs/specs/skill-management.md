# Spec: Agent Skills 统一管理

## 0. 文档信息

- 状态：Approved（需求已确认，可按实施计划进入开发）
- 日期：2026-08-01
- 适用版本：PromptClip Tauri 桌面端
- PromptClip 研究基线：`683a01cc3363cb73f55dd124162d9a45571d9bab`
- Skills-Manager 参考基线：`c0b16ba603d3d110e3e39d587b0a1a3a310ea464`
- 关联决策：`docs/decisions/001-desktop-skill-hub-and-managed-sync.md`
- 实施计划：`IMPLEMENTATION_PLAN.md`

## 1. 已确认产品决策

以下决策已由产品负责人于 2026-08-01 确认；如后续调整，先更新本规格，再修改代码。

1. “客户端版本”指 macOS、Windows、Linux 的 Tauri 桌面端，不含 Web、Tauri iOS 和 Android。
2. 第一阶段只实现 Claude Code、Codex、Cursor、OpenCode 和通用 `~/.agents/skills` 目标；
   Skills-Manager 中的其他工具延后，注册表仍须可扩展。
3. 同步方式采用“全局默认 + 单工具覆盖”，每个首期目标均可选继承、软链接或文件复制。
4. `~/.prompt-clip/skills/<skillId>/SKILL.md` 是唯一源数据；外部 Agent 目录不是第二真相源。
5. 同名外部 Skill 绝不自动覆盖 PromptClip 版本，用户必须在冲突对话框中选择保留哪个版本。
6. “按名称重复”使用 `SKILL.md` frontmatter 的 `name`；缺失时回退目录名。比较时 trim、转小写，
   但不自动合并内容不同的版本。
7. 第一阶段包含收藏，并提供独立“收藏”筛选；收藏不改变默认列表排序。
8. 接受本规格定义的严格 Skill 名称规则和 ZIP 安全限制。
9. 第一阶段不提供删除整个源 Skill 或回收站恢复；可删除 Skill 内的非核心文件，并可取消所有 Agent
   同步。

## 2. 背景与目标

PromptClip 的长期定位从 Prompt 管理扩展为 Agent 资产管理。本功能新增独立的 Skill 管理工作区，
把不同 Agent 工具各自目录中的 Skills 统一收敛到一个本地来源，再按需分发给已安装的工具。

源目录固定为：

```text
~/.prompt-clip/skills
```

目标用户是同时使用 Claude Code、Codex、Cursor、OpenCode 等多个 Agent 工具，并希望离线、本地、
可控地维护同一组 Skills 的个人用户。

成功状态：用户只维护 PromptClip 源目录中的一份 Skill，就能看见本机可用的 Agent 工具、按工具启用
或禁用该 Skill、导入现有工具中的 Skill，并在 PromptClip 中管理 Skill 的完整文件树。

## 3. 产品原则

- 本地优先：所有 Skill、配置和同步标记均保存在本机，不依赖网络或后端。
- 单一来源：PromptClip 源目录是权威版本；Agent 目录只包含链接或受管副本。
- 不破坏外部内容：未知来源的真实目录、文件、链接不得被自动覆盖或删除。
- 状态来自事实：是否启用由文件系统实际状态计算，不只依赖持久化布尔值。
- 明确失败：权限、冲突、部分同步失败必须显示到具体 Skill 和工具，不静默吞掉异常。
- Web 隔离：Web 端入口、Prompt 工作流和构建结果保持原有功能行为。

## 4. 范围

### 4.1 第一阶段包含

- 桌面端 Prompt/Skill 两个独立工作区及双向切换入口。
- 固定源目录初始化、Skill 扫描、名称搜索、收藏筛选和卡片列表。
- 5 个首期 Agent 目标的探测、路径分组、图标展示和重新扫描。
- 软链接、Windows junction、文件复制三种实际落地形态；用户设置暴露“软链接”和“文件复制”。
- 单 Skill、单工具启用/禁用；源文件保存后刷新已启用的复制目标。
- 外部 Agent Skills 扫描、版本去重、冲突选择和导入。
- 上传 `.zip` / `.skill`、直接创建 Skill、单 Skill `.zip` 导出。
- Skill 文件树、文件夹/文本文件创建、上传、重命名、删除、文本编辑、Markdown 预览。
- 四种现有 UI 语言的完整文案。

### 4.2 明确不包含

- 第三方 Skill 市场搜索、浏览、下载或更新。
- Git 仓库安装、远程版本检查、云同步、账号系统。
- 项目级 Skills、团队共享、多个源目录或自定义源目录。
- Web 端 Skill 管理、移动端 Skill 管理。
- 自定义 Agent 工具 UI、Agent 配置文件编辑、Agent 启停。
- Skills-Manager 注册表中首期 5 个目标以外的其他 Agent 工具。
- 二进制文件的应用内预览、图片预览、代码语法高亮或 Monaco 编辑器。
- 自动执行 Skill 中的脚本或对 Skill 做联网安全扫描。

## 5. 术语与目录模型

```text
Hub / Source Root
~/.prompt-clip/
├── skills/
│   └── <skillId>/
│       ├── SKILL.md
│       └── ...
├── skill-manager.json
└── temp/
    ├── imports/
    └── sync/

Agent Targets
~/.claude/skills/<skillId>    -> Hub 中对应目录
~/.codex/skills/<skillId>     -> Hub 中对应目录
~/.agents/skills/<skillId>    -> Hub 中对应目录
...
```

- `skillId`：Skill 的稳定标识，同时是 Hub 一级目录名；第一期等于规范化后的 frontmatter `name`。
- `displayName`：卡片展示名称，第一期同 `name`；保留字段便于以后独立显示名。
- `AgentTool`：用户认知中的一个工具，如 Codex。
- `TargetGroup`：规范化后指向同一物理 `skillsPath` 的一个或多个 Agent 工具。
- `managed target`：PromptClip 创建的有效链接、junction 或含 PromptClip 标记文件的复制目录。
- `external candidate`：Agent 目录中存在、但 Hub 没有收录或内容不同的 Skill。

多个工具若共享同一个目标目录，文件系统无法实现“只给其中一个启用”。因此启停操作以
`TargetGroup` 为真实粒度；UI 仍展示各工具图标，但同组图标状态联动，并通过 tooltip 说明共享路径。

## 6. 用户故事与验收标准

### US-01：进入 Skill 管理

作为桌面端用户，我可以从未选择 Prompt 工作区时的入口页进入 Skill 管理，而无需选择 Prompt 目录。

- Tauri 入口页展示“Prompt 管理”和“Skill 管理”两个主入口。
- 点击 Prompt 管理继续使用现有目录选择流程。
- 点击 Skill 管理初始化 `~/.prompt-clip/skills` 并进入 Skill 列表。
- Web 端不展示 Skill 入口，原入口布局和行为不变。
- 已恢复 Prompt 工作区时仍可按原行为进入 Prompt 页；顶部提供切换到 Skill 的入口。

### US-02：在两个工作区间切换

- Prompt 顶栏提供“Skill 管理”入口。
- Skill 顶栏提供“Prompt 管理”入口。
- 从 Skill 切换到 Prompt 时：若已有授权工作区，直接进入；否则回到目录选择入口。
- 切换不清空 Prompt 工作区、不丢失 Skill 搜索词以外的持久设置。
- Skill 页面不启动 Prompt 自动加载、懒加载、文件监听或快速搜索桥接副作用。

### US-03：浏览、搜索和收藏 Skills

- 列表扫描 Hub 下直接子目录；有效 Skill 必须包含 `SKILL.md`。
- 卡片展示名称、描述、收藏按钮和已检测 Agent 工具图标。
- 默认列表始终按名称不区分大小写升序，不因收藏时间改变顺序。
- 提供“全部 / 收藏”筛选；选择“收藏”时只展示已收藏的 Skills。
- 顶部搜索只按 Skill 名称做不区分大小写的子串匹配。
- 名称搜索在当前“全部 / 收藏”筛选结果内执行。
- 在 Skill 页面使用 `Cmd/Ctrl+K` 打开名称快速切换器；Enter 打开详情。
- 无 Skill、无搜索结果、无已安装 Agent、加载失败均有独立空状态或错误状态。

### US-04：探测 Agent 工具

- 进入 Skill 页时自动探测一次；用户可点击“重新检查”再次执行。
- 工具满足“配置目录存在”或“CLI 可在 PATH 中找到”任一条件即标记为已安装。
- 默认配置路径不存在但备用路径存在时选择第一个已存在的备用路径。
- CLI 存在但配置目录未创建时仍展示工具；首次启用时创建目标 `skills` 目录。
- 卡片只展示本机已安装工具的图标。
- 探测失败不阻止 Hub Skill 展示；失败工具显示在扫描结果摘要中。

### US-05：按工具启用或禁用 Skill

- 点击灰度工具图标发起启用，成功后彩色显示。
- 点击彩色工具图标发起禁用，成功后灰度显示。
- 操作进行中禁用重复点击，并在该图标上显示进度。
- 软链接模式创建目录链接；Windows 可使用 directory symlink 或 junction，但不能静默回退为复制。
- 文件复制模式递归复制完整 Skill，并写入 `.promptclip-sync.json` 管理标记。
- 禁用只移除指向当前 Hub Skill 的链接/junction，或带有效 PromptClip 标记的受管副本。
- 目标存在未知真实目录、错误链接或其他来源副本时返回冲突，不覆盖、不删除。
- 冲突图标可点击；只有用户在显示 Skill、工具和精确目标路径的确认框中同意后，才进入强制接管。
- 共享目标目录的工具图标同步更新。
- 单个失败不会伪装为整体成功；错误包含工具名、目标路径和可执行建议。

### US-06：设置同步方式

- Skill 设置区提供全局默认：`symlink` 或 `copy`。
- 每个已检测工具可选择 `inherit`、`symlink` 或 `copy`。
- 注册表保留 `copyOnly` 扩展能力，但首期 5 个目标均不强制复制。
- 改设置不自动重写现有目标；显示“有 N 个目标需要迁移”，用户确认后批量迁移。
- Windows 选择软链接时提示管理员权限或开发者模式要求，以及 junction 可能被使用。
- 迁移先创建并验证新目标，再移除旧受管目标；任一步失败时尽力回滚。

### US-07：扫描和导入外部 Skills

- “重新检查”同时扫描已安装工具的 Skill 目录。
- 外部扫描只读，不移动、不重命名、不删除任何 Agent 目录内容。
- Agent `skills/<skillId>` 一级条目可为符号链接；扫描和导入解析其目录目标，但仍拒绝 Skill
  内容中的链接、断链及指向非目录的链接。
- 扫描结果记录来源工具、路径、名称、描述、内容指纹和目标管理状态。
- 无法扫描的外部条目必须在结果中显示名称、来源工具、原始路径和失败原因，不得静默忽略；
  原始路径可点击并由系统文件管理器定位。
- 同一物理路径只扫描一次；相同名称且 SHA-256 指纹相同的候选合并来源展示。
- 相同名称但内容指纹不同的候选作为多个版本展示，用户逐组选择。
- Hub 已有同名 Skill 时默认选“保留 PromptClip 版本”；还可选一个外部版本替换或跳过。
- 导入使用复制，不从原工具目录搬走文件；成功后重新扫描 Hub。
- 替换 Hub 版本必须先复制到临时目录并校验，再原子替换；失败保留原 Hub 版本。
- 导入后外部未知目录仍不自动变为受管目标。用户点击该工具图标时进入显式“接管冲突”流程。

### US-08：处理外部目标冲突

- 若目标真实目录与 Hub 指纹相同，用户可选择“接管”：写入复制标记，或替换为链接。
- 若内容不同，用户可选：保留外部版本、导入外部版本后接管、使用 PromptClip 版本覆盖并接管。
- 所有覆盖操作必须二次确认并展示来源、目标和受影响工具。
- 实际覆盖前把被替换内容复制到 `~/.prompt-clip/temp/` 的事务备份；成功后清理，失败时回滚。
- 应用不得提供“强制删除未知目录后继续”的无确认快捷路径。
- 本期卡片提供“使用 PromptClip 版本覆盖并接管”：确认后先把精确目标移动到
  `~/.prompt-clip/temp/conflict-backups/`，创建并校验新目标；失败恢复原目标，成功后清理备份。

### US-09：上传 Skill 包

- 文件选择器接受 `.zip` 和 `.skill`；两者都按 ZIP 容器处理并校验文件魔数。
- 支持 `SKILL.md` 位于归档根目录，或归档只有一个顶层目录且其中包含 `SKILL.md`。
- 一个上传文件第一期只允许包含一个 Skill；多 Skill 包返回明确错误。
- 归档必须通过路径、数量、大小、文件类型和 `SKILL.md` 元数据校验后才写入 Hub。
- 同名时进入冲突选择，不直接覆盖。
- 导入成功后自动打开 Skill 详情页。

### US-10：直接新建 Skill

- 新建表单要求输入名称和描述。
- 名称规则：1–64 字符，小写英文字母、数字和单连字符；不能以连字符开头或结尾。
- 描述 trim 后 1–1024 字符。
- 名称在 Hub 中不区分大小写唯一。
- 创建 `<skillId>/SKILL.md`，写入规范 frontmatter 和可编辑正文模板。
- 创建成功后打开详情并默认选中 `SKILL.md`。

模板：

```markdown
---
name: example-skill
description: Describe when and how this skill should be used.
---

# Example Skill

Add instructions here.
```

### US-11：管理 Skill 文件

- 详情页左侧为可展开文件树，目录优先、同级按名称排序；右侧为内容区。
- 支持新建文件夹、新建文本文件、上传文件、重命名和删除。
- Skill 根目录不可重命名或删除；`SKILL.md` 不可重命名或删除，但可编辑。
- 所有名称拒绝空值、`.`、`..`、路径分隔符、NUL 和平台非法名称。
- 所有操作只接受 `skillId + relativePath`，并验证最终路径仍在对应 Skill 根目录内。
- 源 Skill 中的 symlink、junction 和其他特殊文件不跟随、不读取，并显示为不支持项。
- 上传重名时让用户选择覆盖、自动重命名或取消；不得静默覆盖。
- 删除前确认；删除目录时明确提示会递归删除其内容。
- 切换文件、返回列表或切换工作区前，如有未保存文本，必须提示保存、放弃或取消。

### US-12：查看和编辑文件

- Markdown 文件复用现有 Markdown 渲染样式，并提供“编辑 / 预览”切换。
- 其他 UTF-8 文本以纯文本 textarea 编辑，不执行 HTML、脚本或宏。
- 默认可编辑文本扩展名：`.md`、`.markdown`、`.txt`、`.json`、`.yaml`、`.yml`、
  `.toml`、`.xml`、`.csv`、`.ini`、`.conf`、`.env`、`.js`、`.jsx`、`.ts`、`.tsx`、
  `.css`、`.html`、`.sh`、`.bash`、`.zsh`、`.py`、`.rs`、`.go`、`.java`、`.kt`、`.sql`。
- 文本文件必须是有效 UTF-8 且不超过 2 MiB；否则按不可预览文件处理。
- 其他文件只显示名称、类型、大小和“另存为”操作，不在应用内预览。
- `Cmd/Ctrl+S` 保存；保存成功后更新复制模式下所有已启用目标。
- 源保存成功但部分目标同步失败时，源保存仍算成功，同时显示部分失败报告和“重试同步”。

### US-13：导出单个 Skill

- 卡片菜单和详情页均可导出当前 Skill 为 `.zip`。
- 默认文件名 `<skillId>.zip`。
- ZIP 顶层目录为 `<skillId>/`，保留所有普通文件和空目录，不包含同步标记或临时文件。
- ZIP 内增加根级 `.promptclip-export.json`，记录格式版本、skillId、导出时间和内容指纹。
- 导出不包含 Agent 工具启用状态、用户主目录绝对路径或收藏状态。

## 7. Skill 与同步状态模型

### 7.1 前端领域类型

```typescript
export type SyncMode = 'symlink' | 'copy';
export type ToolSyncMode = 'inherit' | SyncMode;

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  relativePath: string;
  contentHash: string;
  favoritedAt: string | null;
  toolStates: Record<string, SkillToolState>;
}

export type SkillToolStatus =
  | 'disabled'
  | 'enabled'
  | 'stale'
  | 'broken'
  | 'conflict'
  | 'pending';

export interface SkillToolState {
  toolId: string;
  targetGroupId: string;
  status: SkillToolStatus;
  actualMode: 'symlink' | 'junction' | 'copy' | null;
  message: string | null;
}

export interface AgentTool {
  id: string;
  name: string;
  installed: boolean;
  detectionReasons: Array<'config' | 'cli'>;
  configPath: string;
  skillsPath: string;
  targetGroupId: string;
  syncMode: ToolSyncMode;
  effectiveSyncMode: SyncMode;
  copyOnly: boolean;
  iconId: string;
}
```

### 7.2 本地配置

`~/.prompt-clip/skill-manager.json`：

```json
{
  "schemaVersion": 1,
  "defaultSyncMode": "symlink",
  "toolOverrides": {
    "agents-skills": "copy",
    "codex": "inherit"
  },
  "favorites": {
    "example-skill": "2026-08-01T10:00:00.000Z"
  }
}
```

- 配置写入使用临时文件 + rename，避免半写入。
- 未知字段读取时忽略，未知枚举回退安全默认值并报告配置警告。
- `installed`、目标状态和内容 hash 不持久化，每次扫描重建。

### 7.3 复制管理标记

复制目标根目录内的 `.promptclip-sync.json`：

```json
{
  "schemaVersion": 1,
  "owner": "promptclip",
  "skillId": "example-skill",
  "sourceHash": "sha256:...",
  "syncedAt": "2026-08-01T10:00:00.000Z"
}
```

标记不存绝对源路径。只有 owner、skillId 均匹配时，目录才可被 PromptClip 更新或删除。

### 7.4 状态判定

| 目标事实 | 状态 | 是否可直接启用/禁用 |
|---|---|---|
| 路径不存在 | disabled | 可启用 |
| 链接/junction 指向当前 Hub Skill | enabled | 可禁用 |
| 受管副本且 hash 与 Hub 一致 | enabled | 可禁用 |
| 受管副本但 hash 不一致 | stale | 可同步或禁用 |
| 链接不存在或指向缺失源 | broken | 需修复确认 |
| 链接指向其他源、未知真实目录或无效标记 | conflict | 仅通过冲突流程处理 |

## 8. 首期 Agent 工具注册表

首期清单从 Skills-Manager `src-tauri/src/models/tool.rs` 收敛而来。`skillsPath` 默认是所选配置目录
下的 `skills/`。路径均相对用户 Home。

| Tool ID | 名称 | 默认配置目录 | 备用配置目录 | CLI | 约束 |
|---|---|---|---|---|---|
| claude-code | Claude Code | `.claude` | — | `claude` | — |
| codex | Codex | `.codex` | — | `codex` | — |
| opencode | OpenCode | `.config/opencode` | `.opencode` | `opencode` | — |
| cursor | Cursor | `.cursor` | — | `cursor` | — |
| agents-skills | Agents Skills | `.agents` | — | — | 通用共享目录目标 |

`agents-skills` 是 `~/.agents/skills` 的逻辑目标，不代表某一家厂商。它只通过 `.agents` 或
`.agents/skills` 目录存在来探测，不做 CLI 探测，使用通用 Agent 图标。读取该标准目录的多个工具会
天然共享同一启停状态。

注册表必须允许多个工具解析到同一个 `skillsPath`。启动后对路径做平台规范化，并尽可能 canonicalize；
不存在的路径使用规范化绝对路径作为分组键。

Skills-Manager 基线中的其他工具定义保留为后续扩展参考，不属于首期完成标准。

## 9. 页面与交互设计

### 9.1 应用状态切分

不引入路由库。新增应用工作区状态：

```typescript
type AppSection = 'prompts' | 'skills';
```

建议把当前 `AppContent` 中 Prompt 专属 hooks 和布局抽到 `PromptManagerPage`，避免 Skill 页面仍运行
Prompt 加载、监听和快捷搜索副作用。`SkillManagerPage` 使用 `React.lazy`，且只在 Tauri 运行时可达。

### 9.2 桌面入口页

在现有主 CTA 区域提供两张等权入口卡：

- Prompt 管理：目录图标、当前“选择数据目录”行为。
- Skill 管理：扩展/积木图标、说明“统一管理并同步 Agent Skills”。

Web 端继续渲染当前单一 Prompt CTA，不展示禁用占位或“桌面端专属”的无效按钮。

### 9.3 Skill 列表页

- 顶栏：Prompt/Skill 切换、名称搜索、快速切换、重新检查、上传、新建、设置。
- 主区域：复用 Prompt 卡片的圆角、阴影、栅格和 hover 语言，不复用 Prompt 领域组件本身。
- 卡片头部：名称、收藏、更多菜单（导出）。
- 卡片正文：描述，最多 4 行；无描述使用国际化占位。
- 卡片底栏：仅已安装工具图标；彩色代表 enabled/stale，灰度代表 disabled；stale/conflict/broken
  使用角标区分，不能只依赖颜色。
- 点击卡片主体打开 Skill 详情，点击工具图标不得冒泡。

### 9.4 外部扫描与导入对话框

按重复名称分组，每组展示：

- PromptClip 现有版本（如有）。
- 外部候选版本：来源工具图标、路径、描述、修改时间、指纹短值。
- 内容完全相同的来源合并为一项并展示多个工具。
- 单选操作：保留 PromptClip、选择某外部版本、跳过。

默认不选择覆盖；确认按钮旁展示将新增、替换、跳过的数量。

### 9.5 Skill 详情页

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Skills   Skill 名称              导出     保存/同步状态   │
├──────────────────┬──────────────────────────────────────────┤
│ 文件搜索          │ 编辑 / 预览                              │
│ ＋文件  ＋目录 上传│                                          │
│ ▼ skill-id       │ SKILL.md 或纯文本编辑区                  │
│   SKILL.md       │                                          │
│   references/    │                                          │
│   scripts/       │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

左栏建议宽 260–320px，可滚动；右栏独立滚动。第一期无需拖拽移动或分栏缩放。

## 10. 技术架构

### 10.1 分层

```text
React components
  -> skillStore / uiStore
    -> skillService (typed Tauri invoke adapter)
      -> Tauri skill commands
        -> registry / scanner / sync / archive / file operations
          -> local filesystem
```

路径、链接、ZIP、hash、原子替换和目录遍历放在 Rust；React 只提交标识、相对路径和用户决策。

### 10.2 建议目录

```text
src/types/skill.ts
src/constants/agentToolIcons.ts
src/services/skillService.ts
src/stores/skillStore.ts
src/hooks/useSkillManager.ts
src/components/skill/
  SkillManagerPage.tsx
  SkillTopBar.tsx
  SkillGrid.tsx
  SkillCard.tsx
  SkillQuickSwitcher.tsx
  SkillCreateModal.tsx
  SkillImportModal.tsx
  SkillConflictModal.tsx
  SkillSettingsModal.tsx
  SkillDetailPage.tsx
  SkillFileTree.tsx
  SkillFileEditor.tsx
  index.ts
src/assets/agents/
src-tauri/src/skills/
  mod.rs
  models.rs
  paths.rs
  registry.rs
  scanner.rs
  sync.rs
  archive.rs
  files.rs
  commands.rs
```

新增模块后更新各层 barrel。Rust `lib.rs` 只注册命令，不承载业务逻辑。

### 10.3 Tauri 命令契约

命令名可在实现时微调，但输入边界和返回语义必须保持：

```text
skill_initialize() -> SkillManagerSnapshot
skill_scan_hub() -> SkillScanResult
skill_detect_tools() -> ToolDetectionResult
skill_scan_external() -> ExternalScanResult
skill_import_external(request) -> ImportResult
skill_set_tool_enabled(skillId, targetGroupId, enabled) -> SyncOperationResult
skill_update_settings(request) -> SkillManagerSettings
skill_migrate_sync_modes(request) -> BatchSyncResult
skill_create(request) -> SkillSummary
skill_preview_archive(sourcePath) -> ArchivePreview
skill_import_archive(sourcePath, resolution) -> ImportResult
skill_export(skillId, destinationPath) -> ExportResult
skill_tree(skillId) -> SkillFileNode
skill_read_text(skillId, relativePath) -> TextFileContent
skill_write_text(skillId, relativePath, content, expectedModifiedAt) -> SaveResult
skill_create_file(skillId, parentPath, name) -> SkillFileNode
skill_create_directory(skillId, parentPath, name) -> SkillFileNode
skill_upload_file(skillId, parentPath, sourcePath, conflictMode) -> SkillFileNode
skill_rename_path(skillId, relativePath, newName) -> SkillFileNode
skill_delete_path(skillId, relativePath) -> DeleteResult
skill_export_file(skillId, relativePath, destinationPath) -> ExportResult
```

- 所有命令返回结构化错误码和可本地化参数，不把 Rust 英文错误直接作为最终 UI 文案。
- `skill_write_text` 使用 `expectedModifiedAt` 做乐观并发控制；磁盘文件变化时拒绝覆盖并提示重新加载。
- 批量结果包含 success、skipped、failed 明细，允许部分成功。
- 外部 `sourcePath` / `destinationPath` 只用于 OS 文件对话框选中的导入、上传、导出例外；不得新增
  任意绝对路径的通用读写删除命令。

### 10.4 依赖建议

优先使用标准库。预计 Rust 需要新增：

- `dirs = "5"`：跨平台解析 Home。
- `sha2 = "0.10"`：稳定内容指纹。
- `zip = "0.6.6"`：ZIP 导入导出，与参考项目保持一致。
- `serde_yaml = "0.9"`：可靠解析 `SKILL.md` frontmatter。
- `tempfile = "3.10"`（dev-dependency）：隔离文件系统测试。

新增运行时依赖属于实现前审批项；如果已有锁文件要求不同兼容版本，以 `cargo check` 结果为准。

### 10.5 图标

- 从本地 Skills-Manager `src/assets/tools/` 选择与首期工具 ID 对应的 SVG/PNG/JPEG。
- 使用 `import.meta.glob` 建立 `toolId -> URL` 映射，SVG 优先于 PNG/JPEG，未知工具显示通用终端图标。
- Skills-Manager 采用 MIT License；复制资源时在 PromptClip 增加或更新第三方声明，保留版权和许可证。
- 启用/禁用用 CSS `grayscale`、opacity 和状态角标实现，不维护两套图片。

## 11. 核心算法

### 11.1 Hub 扫描

1. 创建固定根目录和配置文件（不存在时）。
2. 只枚举 `skills/` 的直接子目录，忽略隐藏项、链接和特殊文件。
3. 每个目录查找精确大写 `SKILL.md`；缺失项记为 invalid，不进入正常卡片。
4. 解析 frontmatter `name`、`description`，校验 name 与目录名一致。
5. 对普通文件按相对路径排序，计算稳定 SHA-256；忽略 `.promptclip-sync.json` 和临时文件。
6. 读取实际 TargetGroup 状态，组装 `SkillSummary`。

外部 Agent 扫描可兼容 `skill.md` 小写以发现历史资产，但导入时规范为 `SKILL.md`。

### 11.2 工具探测

1. 从注册表拼接 Home 与默认配置目录。
2. 默认目录不存在时，依次检查备用目录。
3. 检查配置目录是否存在。
4. 检查 PATH 中是否存在对应可执行文件；Windows 同时检查 `.exe`、`.cmd`、`.bat`。
5. 计算规范化 `skillsPath`，按路径生成稳定 `targetGroupId`。
6. 返回全部探测结果；前端仅展示 `installed = configExists || cliExists` 的工具。

### 11.3 启用

1. 验证 Hub Skill 有效，解析 TargetGroup 和 effective mode。
2. 检查 `<skillsPath>/<skillId>` 当前状态。
3. 若已是正确有效目标，幂等返回 skipped。
4. 若是 conflict，停止并返回冲突信息。
5. 软链接：创建父目录；Unix 建 symlink；Windows 尝试 directory symlink，再尝试 junction。
6. 复制：复制到同级临时目录、写标记、校验 hash，再 rename 到目标。
7. 重新读取目标事实，只有状态为 enabled 才返回成功。

#### 11.3.1 冲突目标强制接管

1. 前端只在目标状态为 `conflict` 时提供强制覆盖入口，并使用 Tauri 原生警告对话框展示 Skill
   名称、工具名和 `<skillsPath>/<skillId>` 精确路径；只有对话框明确返回确认时才能调用强制接管
   命令，取消或对话框异常均不得触碰目标。
2. Rust 不信任前端状态，重新校验 Skill ID、Hub 源目录、TargetGroup、effective mode 和目标事实。
3. 若原生复查发现目标已不再冲突，则退回普通幂等启用流程；若仍为 `conflict` 或 `broken`，才执行接管。
4. 只允许替换精确目标上的目录、普通文件、symlink 或 junction；拒绝其他特殊文件。
5. 先用 `rename` 将精确目标移动到 `~/.prompt-clip/temp/conflict-backups/` 的唯一事务目录。若目标与
   Hub 临时目录不在同一文件系统、无法原子移动，则安全失败且不修改原目标。
6. 按 effective mode 创建软链接或受管副本，并重新检查状态和实际同步方式。
7. 创建或校验失败时，移除尚未完成的新目标并把事务备份原路恢复；回滚失败必须返回结构化错误，
   不得静默继续。
8. 新目标校验成功后删除事务备份并返回最新 TargetGroup 状态；备份清理失败时保留备份并明确报错，
   便于人工恢复。

### 11.4 禁用

1. 目标不存在时幂等成功。
2. 链接/junction 只有在规范化目标等于当前 Hub Skill 时才移除链接本身。
3. 复制目录只有标记 owner、skillId 匹配时才递归删除。
4. 其他状态一律返回 conflict，不触碰磁盘内容。

### 11.5 复制同步

- 每次源文本保存成功后，仅刷新已启用且 effective mode 为 copy 的 TargetGroup。
- 复制使用临时目录和可回滚替换，避免目标处于半复制状态。
- 一个 TargetGroup 失败不阻止其他组；返回分组报告。
- 软链接目标不做内容复制，只检查链接有效性。

### 11.6 重复和版本选择

```text
duplicateKey = lowercase(trim(frontmatter.name ?? directoryName))
versionKey   = sha256(normalized relative paths + file bytes)
```

- duplicateKey 不同：独立 Skill。
- duplicateKey 相同且 versionKey 相同：同一版本，合并来源。
- duplicateKey 相同且 versionKey 不同：冲突版本，必须用户单选。
- Hub 同名目录大小写不同，在 Windows/macOS 默认文件系统上也视为冲突。

## 12. 归档安全规则

导入限制采用以下首期默认值：

- 压缩文件最大 50 MiB。
- 解压后总大小最大 200 MiB。
- 最多 5,000 个条目。
- 单文件最大 50 MiB。
- 拒绝绝对路径、`..`、Windows drive/UNC、NUL、超出根目录的路径。
- 拒绝 ZIP 内 symlink、junction、hard link、设备文件和其他特殊条目。
- 拒绝加密归档、CRC 失败、重复规范化路径和多 Skill 根。
- 临时解压成功并完成全量校验后，才允许写入 Hub。
- 失败时清理本次临时目录，不留下半导入 Skill。

`.skill` 只是一种允许的扩展名，不改变上述 ZIP 格式和安全规则。

## 13. 安全与可靠性边界

- 不信任来自 React 的 `skillId`、相对路径、工具 ID 或冲突决策；Rust 重新校验。
- Hub 和 Agent 根路径必须是绝对路径；相对用户输入不得参与拼接。
- 对现有路径使用 `symlink_metadata`，先判断链接再判断目录，禁止跟随未知链接。
- 对父路径 canonicalize，并验证仍位于授权根目录内；不存在的尾部组件逐段校验。
- 不能把当前 Prompt `FileRepository` 扩展成可访问 Home 任意路径的接口。
- 不记录 Skill 文件正文、用户主目录或完整外部路径到分析服务。
- 不执行上传或导入包中的脚本。
- 删除、覆盖、接管和同步模式迁移必须由明确用户动作触发。
- 应用崩溃后下一次扫描应识别并清理自己创建的过期临时目录，但不得清理未知目录。

## 14. 现有代码复用与差异

### 14.1 PromptClip 中复用的模式

1. `WelcomeScreen`：复用 Tauri/Web 运行时分支，保持 Web 入口不变。
2. `PromptCard`、`PromptGrid`、`TopBar`：复用视觉 token、卡片密度、搜索和操作反馈模式。
3. `CommandPalette`：复用键盘导航和快速切换交互，但 Skill 只按名称过滤。
4. `DetailPanel`、`MarkdownModeToggle`、Markdown 渲染工具：复用预览样式和模式切换。
5. `fileRepository`：只借鉴 relative-path 安全边界；Skill 文件系统使用独立原生服务。

### 14.2 Skills-Manager 中借鉴的机制

- 工具注册表、默认/备用配置目录和 PATH 探测；首期只取其中 4 个具体工具，并增加通用
  `~/.agents/skills` 逻辑目标。
- 递归复制包含隐藏文件、Windows symlink/junction 处理和 `copyOnly` 扩展模型。
- 复制目标写管理标记；禁用时拒绝删除非受管真实目录。
- 链接状态区分 valid、broken、wrong target、not a link、missing。
- 外部 Skills 扫描和用户显式选择导入。
- Skill 卡片工具图标、文件树、ZIP 导入导出及冲突预览。

### 14.3 明确不照搬的部分

- 不复制接收任意绝对路径的通用 `read_file` / `write_file` / `delete_path` API。
- 不把导入实现为“移动外部源再在原处建链接”；PromptClip 默认只读扫描并复制导入。
- 不静默把 Windows 软链接失败降级成复制，以免用户设置与实际状态不一致。
- 不用简单 bool 表示工具状态；保留 stale、broken、conflict 以避免误删。

## 15. 代码风格

遵循项目现有 TypeScript/React 约定；Rust 遵循 `cargo fmt` 默认风格。

```typescript
export interface SetSkillEnabledOptions {
  skillId: string;
  targetGroupId: string;
  enabled: boolean;
}

/**
 * Updates one physical Agent target and returns the verified filesystem state.
 */
export async function setSkillEnabled(
  options: SetSkillEnabledOptions
): Promise<SyncOperationResult> {
  return invoke('skill_set_tool_enabled', options);
}

export const SkillService = {
  setSkillEnabled,
} as const;
```

- 组件函数式 + 命名导出，Props 类型在同文件导出。
- 跨模块使用 `@/`，同模块使用相对导入。
- Service 为独立函数 + `as const` 对象。
- Zustand 使用现有 `create<State>()((set, get) => ...)` 模式。
- 所有用户可见文案进入 `zh-CN`、`zh-TW`、`en-US`、`ja-JP` 四语言消息。
- 不引入 CSS Modules、CSS-in-JS、React Context 或新的 UI 组件库。

## 16. 测试策略

严格执行 RED/GREEN TDD。Rust 文件系统测试使用临时目录和注入的 Home/注册表，不能访问真实
`~/.prompt-clip` 或真实 Agent 目录。

### 16.1 Rust 单元与集成测试

- 路径：拒绝绝对相对路径、`..`、链接逃逸、非法 Windows 名称。
- 注册表：5 项完整，默认/备用目录正确，通用 `.agents` 目标不做 CLI 探测，路径分组稳定。
- 探测：仅配置目录、仅 CLI、默认/备用优先级、未安装、PATH 扩展名。
- Hub 扫描：有效 Skill、缺 `SKILL.md`、无效 frontmatter、目录/name 不一致、hash 稳定。
- 链接：启用幂等、正确禁用、broken/wrong target、未知目录拒绝删除、相对链接解析。
- 复制：包含隐藏文件、标记校验、stale、原子替换、回滚、部分失败。
- 共享目标：同路径工具生成同 group，任一图标操作后状态一致。
- 外部扫描：同路径去重、同名同 hash 合并、同名异 hash 分版本。
- 导入：新增、保留、替换、失败回滚、小写 `skill.md` 规范化。
- ZIP：Zip Slip、绝对路径、symlink、重复条目、炸弹限制、多根、缺 frontmatter。
- 文件树：核心文件保护、文本大小/UTF-8、并发修改、上传冲突、特殊文件拒绝。

### 16.2 前端 Vitest

- `App`：Web 不展示 Skill 入口；Tauri 可进入 Skill；无 Prompt 工作区时可从 Skill 返回入口。
- `SkillCard`：名称描述、收藏、只显示已安装工具、颜色与角标、事件不冒泡。
- `SkillTopBar`：名称过滤、清空、重新扫描、创建/上传操作。
- `SkillQuickSwitcher`：快捷键、上下键、Enter、无结果。
- `SkillImportModal`：同名版本单选、默认保留、数量摘要、失败明细。
- `SkillFileTree`：展开、创建、重命名、删除保护、上传冲突。
- `SkillFileEditor`：Markdown 预览、纯文本、binary fallback、未保存离开保护、保存冲突。
- `skillStore`：加载、部分失败、toggle 后以服务返回事实更新、共享组联动。
- i18n：四语言 key 结构一致，无硬编码用户可见字符串。

### 16.3 手动桌面验证

- macOS：symlink、外部目录冲突、导入/导出、实时源编辑。
- Windows：管理员/开发者模式 symlink、junction、copy、权限失败提示、路径大小写。
- Linux：symlink、不可写目录、CLI 探测、不同文件系统上的复制/rename fallback。
- Web：入口、Prompt 加载、搜索、编辑、导出与现有测试回归。

## 17. 命令

```bash
npm run dev
npm run test -- --run
npm run type-check
npm run lint
npm run build
npm run tauri:dev
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

建议实现时增加：

```json
{
  "test:rust": "cargo test --manifest-path src-tauri/Cargo.toml"
}
```

## 18. 边界

### Always

- 固定使用 `~/.prompt-clip/skills` 作为源目录。
- Web 端保持原功能行为，Skill UI 仅在 Tauri 桌面端可达。
- 文件系统状态是启用状态真相源。
- 删除目标前验证它是当前 Skill 的受管目标。
- 覆盖/导入使用临时目录、校验和可回滚替换。
- 用户可见文字覆盖四语言。
- 新增模块更新 barrel；实现先写失败测试，再写最少实现。
- 运行前端测试、Rust 测试、类型检查、lint、build、fmt 和 clippy。

### Ask first

- 改变固定源目录或支持多个源目录。
- 增加自定义 Agent、项目级 Skill、市场或云功能。
- 改变 Skill 名称规则、归档限制或整项删除策略。
- 新增运行时依赖或引入代码编辑器/UI 组件库。
- 让 Web/移动端显示 Skill 功能。
- 自动覆盖未知外部目录或在没有用户确认时迁移同步模式。

### Never

- 不执行 Skill 脚本，不连接第三方 Skill 市场。
- 不把 Skill 内容、路径或配置上传到外部服务。
- 不跟随未知 symlink 递归扫描、复制或删除。
- 不删除无 PromptClip 管理标记的真实目录。
- 不以持久化 bool 代替实际链接/副本验证。
- 不跳过、禁用或删除失败测试来使构建通过。

## 19. 完成标准

- 原始需求 1–16 均有对应用户故事、技术规则或明确非目标。
- Tauri 用户可在入口、Prompt 页、Skill 页之间按规则切换；Web 行为不变。
- Hub、5 个首期 Agent 目标、共享路径分组和两种用户同步方式可工作。
- 用户可安全导入外部 Skills，处理同名同版本/异版本冲突。
- 用户可上传、新建、搜索、收藏、编辑文件树和导出单 Skill。
- 未知 Agent 内容在扫描、启用、禁用、迁移失败时不会被误删或静默覆盖。
- 四语言 UI 完整，键盘与非颜色状态提示可访问。
- 全部自动化和手动验证通过，无真实 Home 目录测试副作用。

## 20. 需求追踪

| 原需求 | 覆盖章节 |
|---|---|
| 1 Web 不改、仅客户端 | 4、6/US-01、13、18 |
| 2 入口页入口 | US-01、9.2 |
| 3 Prompt/Skill 双向切换 | US-02、9.1 |
| 4 软链接/复制 | US-05、US-06、11.3–11.5 |
| 5 固定源路径 | 2、5、7.2 |
| 6 Agent 探测与共享路径 | US-04、8、11.2 |
| 7 外部 Skill 导入与重复选择 | US-07、US-08、11.6 |
| 8 卡片、图标、启停、收藏 | US-03、US-05、9.3、10.5 |
| 9 手动重新检查 | US-04、US-07、9.4 |
| 10 上传与直接新建 | US-09、US-10、12 |
| 11 文件资源管理器与编辑 | US-11、US-12、9.5 |
| 12 不做市场 | 4.2、18 |
| 13 名称快速搜索 | US-03 |
| 14 单 Skill ZIP 导出 | US-13 |
| 15 单源多目标机制 | 2、5、10.1 |
| 16 参考 Skills-Manager | 0、8、14 |

## 21. 审批结果

产品负责人已于 2026-08-01 确认：

- 首期只支持 Tauri 桌面端，不包含 iOS/Android。
- 同步设置采用“全局默认 + 单工具覆盖”。
- 包含收藏，并以独立筛选查看收藏列表，不按收藏时间排序。
- 接受严格 Skill 名称规则和 ZIP 安全限制。
- 首期不增加删除整个源 Skill 或回收站恢复。
- 首期实现 Claude Code、Codex、Cursor、OpenCode 和通用 `~/.agents/skills` 目标。

当前无阻塞开发的开放问题。

## 22. 实现验证记录

2026-08-01 验证结果：

| 平台 | 结果 | 范围 |
|---|---|---|
| macOS | 通过 | 全量自动化、Tauri 编译与真实桌面进程启动；Unix symlink/copy/迁移由临时目录测试覆盖 |
| Windows | 待发布环境手测 | junction/权限错误与原子文件替换已实现；当前 macOS 环境无法执行 Windows GUI 与管理员权限验证 |
| Linux | 待发布环境手测 | Unix symlink/copy 由自动化覆盖；当前环境无法执行 Linux GUI 与目录权限验证 |
| Web | 通过 | 395 项前端测试、生产构建和真实浏览器入口回归；未出现 Skill 入口或控制台异常 |

自动化结果：前端 395 项、Rust 76 项通过；TypeScript、ESLint、Vite build、rustfmt 和
Clippy `-D warnings` 均通过。Windows 与 Linux 的真实桌面手测属于发布签收项，不影响本期代码
功能完成，但发布前不得将对应平台标记为人工验收通过。
