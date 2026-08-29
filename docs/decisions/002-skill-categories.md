# ADR-002: Skill 分类作为 SkillManagerSettings 内的扁平多选映射

## Status

Accepted

## Date

2026-08-06

## Context

Skills 当前只能通过「收藏」与「按 Agent 工具」两个维度筛选。用户从外部 Agent 导入大量 Skill 后，
列表迅速膨胀且缺少自定义组织维度。我们需要一个用户可定义的分类机制，并复用 Prompts 已有的
「侧栏树 + 卡片 pill + 筛选」范式以降低成本、保持一致。

三个核心语义问题必须先定：

- 一个 Skill 可属于几个分类（单属 vs 多属）。
- 「默认类别」是一个真实可指派的分类，还是未分类 Skill 的虚拟收纳桶。
- 分类元数据存放在哪里（Skills 是 Tauri 文件系统驱动，没有像 Prompt 那样的 markdown frontmatter
  可塞标签）。

## Decision

1. **多选指派**：一个 Skill 可属于 0..N 个分类，语义和交互对齐 Prompts 标签。
2. **默认类别为虚拟收纳桶**：内置、置顶、不可删除 / 不可重命名 / 不可被显式指派；
   `skillCategories` 映射为空 / 缺失的 Skill 自动归此。
3. **分类扁平**：不引入 `/` 层级（区别于 Prompts 标签），保持简单。
4. **存储扩展 `SkillManagerSettings`**：新增 `categories: SkillCategory[]` 与
   `skillCategories: Record<skillId, categoryId[]>`，与 `favorites` 同源；新字段在 Rust
   结构体上用 `#[serde(default)]` 标注，旧配置文件平滑反序列化，无需 `schemaVersion` 升级。
5. **新增细粒度 IPC**：分类 CRUD 与指派用独立命令 `skill_add_category` /
   `skill_rename_category` / `skill_delete_category` / `skill_set_skill_categories`，
   各自返回最新 `SkillManagerSettings`，与 `skill_set_favorite` 风格对齐；不混入
   `skill_update_settings`（其签名只覆盖 syncMode/toolOverrides，语义不混杂）。
6. **分类名大小写不敏感去重**：`Work` 与 `work` 视为重名，显示保留原大小写；长度 ≤20；
   四语言的「默认类别」文案为保留字。
7. **筛选取交集（AND）**：分类筛选与搜索 / 收藏 / Agent 工具筛选叠加为 AND。
8. **仅桌面端**：随 Skills 整体，Web 端不暴露入口。

## Alternatives Considered

### 分类单属（一个 Skill 只属于一个分类，类文件夹）

- 优点：语义最简单，UI 近乎单选。
- 缺点：与用户「一个或多个分类」诉求冲突；与 Prompts 标签范式不一致；跨类别场景需重复建 Skill。
- 结论：拒绝。

### 「默认类别」是真实可指派的分类

- 优点：实现统一，无特判。
- 缺点：与「缺省都属于默认类别」语义冲突——会让「指派到默认」与「未指派」成为两种状态，
  计数与 UI 都要处理歧义。
- 结论：拒绝。采用虚拟收纳桶：移除所有指派 = 回到默认，语义自洽。

### 分类元数据写入 Skill 文件（SKILL.md frontmatter）

- 优点：分类随 Skill 文件走，可移植。
- 缺点：SKILL.md 的 frontmatter 由 Rust 解析且对外有契约；分类是 PromptClip 的组织视图，
   不应污染 Skill 资产；写入需改 Rust 解析与外部 Agent 兼容性。
- 结论：拒绝。分类作为 PromptClip 私有元数据，存 settings。

### 前端独立持久化（Zustand persist / localStorage）

- 优点：零后端改动，最快落地。
- 缺点：与 `favorites` 分裂成两个真相源；跨设备 / 重装时丢失；后续仍需迁移回 settings。
- 结论：拒绝作为最终方案。若需快速验证可在 v1 临时使用，但需预留一次性迁移。

### 复用 `skill_update_settings` 整包写回

- 优点：不新增后端命令。
- 缺点：`skill_update_settings` 当前签名只接收 `defaultSyncMode` + `toolOverrides`，
  扩展其签名接收 `categories` / `skillCategories` 改动面反而更大，且 syncMode 与分类
  指派语义混杂；每次勾选都重写整份 settings 也更易引发并发覆盖。
- 结论：拒绝。改用对齐 `skill_set_favorite` 的细粒度命令。

## Consequences

- `SkillManagerSettings` 结构扩展；新字段用 `#[serde(default)]` 保证旧配置文件向后兼容，但 `config.rs` 的 `parse_settings` 仍需显式映射 raw → settings（跳过非法分类项、过滤孤儿指派）。
- 默认类别计数需在内存派生（`skillCategories` 为空 / 缺失的 Skill 数），不可直接持久化。
- 删除分类 / 删除 Skill 时需同步清理 `skillCategories` 映射，避免脏数据。
- 分类名校验需维护一份四语言保留字列表，i18n 新增文案时需同步更新该校验常量。
- 新增 `category` 图标需更新字体子集清单并跑回归脚本。

## Follow-up

- 按 `specs/skill-categories.md` 进入实现；变更核心存储边界或默认类别语义时新建替代 ADR，
  不直接改写本决策历史。
- 若未来引入分类层级、颜色自定义或详情页分类编辑，先更新规格再实现。
