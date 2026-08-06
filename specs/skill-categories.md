# Spec: Skill 分类（Categories）

## 0. 文档信息

- 状态：Accepted
- 日期：2026-08-06
- 关联决策：`docs/decisions/002-skill-categories.md`
- 关联主规格：`specs/skill-management.md`
- 平台：桌面端（Tauri）专属，随现有 Skills 功能启用；Web 端不暴露入口

## 1. 已确认产品决策

| 项 | 决策 |
|----|------|
| 一个 Skill 可属于几个分类 | **多选**（0..N） |
| 「默认类别」语义 | **虚拟收纳桶**（不可删除 / 不可重命名 / 不可被显式指派；未指派任何分类的 Skill 自动归此） |
| 分类数据存储 | **扩展 `SkillManagerSettings`**（Rust 管理 JSON，`schemaVersion` +1 迁移） |
| 分类区在侧栏位置 | **Agents 列表下方** |
| 卡片分类 pills 展示 | **需要展示** |
| 分类名去重 | **大小写不敏感**（`Work` 与 `work` 视为重名），显示保留原大小写 |

## 2. 背景与目标

目前 Skills 仅能通过「收藏 ★」和「按 Agent 工具」两个维度筛选。当用户从外部 Agent（Claude Code 等）
导入大量 Skill 后，列表迅速膨胀且无法自定义分组，缺少一个用户可定义的组织维度。

本功能在不改变 Skill 文件本身的前提下，为 Skills 增加扁平的「分类」维度，复用 Prompts 已有的
「标签树侧栏 + 标签赋值 + 标签筛选 + 卡片 pill 展示」范式，降低落地成本并保持视觉一致。

## 3. 产品原则

- **最小破坏**：不修改 Skill 文件内容/结构；分类是 PromptClip 对 Skill 的组织元数据。
- **单一真相源**：分类映射与 `favorites` 同源，统一保存在 `SkillManagerSettings`。
- **与 Prompts 范式对齐**：交互、配色、组件结构尽量 1:1 复用 tag 体系。
- **默认安全**：删除分类只解除指派，不删除 Skill；新增/导入的 Skill 自动归默认类别。

## 4. 范围

### 4.1 包含

- 侧栏分类区（默认类别 + 用户自建分类，含新增 / 重命名 / 删除）。
- 卡片右上角菜单「添加到分类」多选指派。
- 卡片分类 pills 展示与点击筛选。
- 按分类筛选，并与现有搜索 / 收藏 / Agent 工具筛选取交集（AND）。
- 四语言 i18n 文案。
- `schemaVersion` 迁移与后端整包写回。

### 4.2 明确不包含（未来扩展）

- 分类层级嵌套（子分类）。
- 分类拖拽排序与颜色自定义（先沿用哈希配色）。
- 按分类批量指派 / 移动多个 Skill。
- 分类在 Skill 详情页的展示与编辑。

## 5. 术语

- **分类（Category）**：用户自建的扁平分组；`id` 稳定（重命名不变），支持多选指派。
- **默认类别（Default）**：内置虚拟分类，置顶；不可删除 / 不可重命名 / 不可被显式指派。
  未指派任何用户分类的 Skill 自动出现在「默认类别」下。

## 6. 用户故事与验收标准

### US-01：在侧栏查看分类

- 作为用户，我打开 Skills 管理页，在左侧栏 Agents 列表下方看到「分类」区。
- 区域包含一个置顶的「默认类别」与我的所有自建分类，每条显示色点 + 名称 + 计数。
- 计数 = 该分类下的 Skill 数量；默认类别计数 = 未指派任何分类的 Skill 数量。

### US-02：新增分类

- 我点击分类标题行的「+」，输入名称（≤20 字符），创建成功。
- 校验：非空；大小写不敏感唯一；禁止与「默认类别」及其本地化文案重名。
- 新建后不自动选中，可在列表中点击筛选。

### US-03：重命名分类

- 我在自建分类条目的 `more_horiz` 菜单选择「重命名」，输入新名。
- 校验同 US-02。仅改分类名，指派关系自动跟随（以 `categoryId` 为 key）。

### US-04：删除分类

- 我在自建分类条目菜单选择「删除」，二次确认后删除。
- 仅解除该分类的所有指派；原本只属该分类的 Skill 自动落回「默认类别」。
- 不删除任何 Skill 文件。

### US-05：按分类筛选

- 我点击任一分类条目，右侧网格只显示该分类下的 Skill，选中条目高亮。
- 分类筛选与搜索 / 收藏 / Agent 工具筛选**取交集（AND）**。
- 切换 section（prompts↔skills）或离开页面时，清空分类筛选，避免空列表困惑。

### US-06：给 Skill 指派分类

- 我在某 Skill 卡片右上角 `more_vert` 菜单点击「添加到分类」，展开多选复选框面板。
- 面板列出所有用户自建分类（不含默认类别）；当前已属分类预勾选。
- 勾选 / 取消即时持久化；提供「全选 / 全不选」。
- 指派到 ≥1 个用户分类后，该 Skill 不再计入「默认类别」；取消所有指派则回归默认。

### US-07：在卡片上看到分类

- 每个 Skill 卡片底部展示其所属分类 pills，最多 N 个 + 「+M」溢出。
- 颜色沿用 `getTagColor` 哈希配色；点击 pill = 按该分类筛选。

## 7. 数据模型

### 7.1 新增类型（`src/types/skill.ts`）

```ts
export interface SkillCategory {
  id: string;        // uuid，稳定，重命名不变
  name: string;
  createdAt: string; // ISO
}
```

### 7.2 扩展 `SkillManagerSettings`

```ts
export interface SkillManagerSettings {
  schemaVersion: number;           // +1 并写迁移
  defaultSyncMode: SyncMode;
  toolOverrides: Record<string, ToolSyncMode>;
  favorites: Record<string, string>;
  customTools: CustomToolDefinition[];
  disabledToolIds: string[];
  toolOrder: string[];
  categories: SkillCategory[];               // 新增；不含默认类别
  skillCategories: Record<string, string[]>; // 新增；skillId -> categoryId[]
}
```

- 「默认类别」不入库，由 `skillCategories` 为空 / 缺失派生。
- 新字段在 Rust 结构体上标注 `#[serde(default)]`，**旧配置文件可平滑反序列化**（缺字段时回退为空），无需强制 `schemaVersion` 升级；`config.rs` 的 `RawSettings` 同步加 `#[serde(default)]`，并在解析阶段跳过非法分类项、过滤指向不存在分类的孤儿指派。

### 7.3 常量（`src/constants/defaults.ts`）

```ts
export const DEFAULT_CATEGORY_ID = '__default__';
export const CATEGORY_NAME_MAX_LENGTH = 20;
export const RESERVED_CATEGORY_NAMES = ['默认类别', '預設類別', 'Default', 'デフォルト']; // 大小写不敏感比对
```

## 8. 前端分层改动

### 8.1 服务层（`src/services/skillService.ts` + `categoryService.ts`）

- 新增 4 个细粒度 IPC（对齐 `skill_set_favorite` 风格），各自返回最新 `SkillManagerSettings`：
  `skill_add_category(name)` / `skill_rename_category(id, name)` /
  `skill_delete_category(id)` / `skill_set_skill_categories(skillId, categoryIds)`。
  前端在 `skillService` 中各包一层 `requireDesktop()` + `invoke`，并挂到 `SkillService` const。
- `categoryService.ts` 为无副作用的纯函数模块（参考 `tagService` 风格）：
  `validateCategoryName(name, existing, excludeId?)`（非空 / 长度 / 保留字 / 大小写不敏感唯一）、
  `buildCategoryCounts(skills, settings)`（派生含默认类别的计数）、
  `categoriesForSkill(skillId, settings)`、`findCategory(id, settings)`、`isReservedCategoryName(name)`。
- Rust 后端校验错误码：`skill_category_name_required` / `skill_category_name_too_long` /
  `skill_category_name_duplicate` / `skill_category_name_reserved` / `skill_category_not_found`。

### 8.2 Store（`src/stores/skillStore.ts`）

- 扩展 `SkillFilter`：新增 `category?: string | null`（`null` = 不过滤；`DEFAULT_CATEGORY_ID` = 默认类别）。
- `applyFilter`：按 `category` 过滤（默认类别特判为 `categories.length === 0`），与既有维度取 AND。
- 新增 actions：`addCategory(name)` / `renameCategory(id, name)` / `deleteCategory(id)` /
  `setSkillCategories(skillId, categoryIds[])` / `setCategoryFilter(id | null)`。
- `deleteSkill` 时同步清理 `skillCategories` 中该 skillId 的记录，防脏数据。

### 8.3 侧栏（`src/components/layout/Sidebar.tsx`，skills 分支）

- 在 Agents 列表（约 109-149 行）下方新增分类区。

### 8.4 新组件

- `src/components/skill/SkillCategoryTree.tsx`：侧栏分类列表（参考 `tag/TagTree.tsx`）。
- `src/components/skill/SkillCategoryAssignPanel.tsx`：卡片多选指派面板（参考 `tag/TagSelect.tsx`）。
- 复用或抽出一个 `CategoryPill`（可基于 `tag/TagPill.tsx` 泛化）。

### 8.5 卡片（`src/components/skill/SkillCard.tsx`）

- 菜单（约 104-151 行）插入「添加到分类」项，挂载指派面板。
- 卡片底部渲染分类 pills（参照 `PromptCard` tag pills）。

### 8.6 页面编排（`src/components/skill/SkillManagerPage.tsx`）

- 串联分类筛选状态与侧栏 / 卡片交互。

## 9. i18n（`src/i18n/messages.ts`）

在 zh-CN、zh-TW 的 `skills` 块新增（en-US / ja-JP 若已有 skills 块则同步），并保持
`messages.test.ts` 形状校验通过：

`categories` / `defaultCategory`（四语言保留字）/ `addCategory` / `categoryName` /
`categoryNamePlaceholder` / `renameCategory` / `deleteCategory` / `deleteCategoryConfirm(name)` /
`deleteCategoryNote` / `addToCategory` / `newCategory` / `selectAll` / `deselectAll` /
`noSkillsInCategory` / 错误：`categoryNameRequired` / `categoryNameTooLong` /
`categoryNameDuplicate` / `categoryNameReserved`。

## 10. 非功能需求

- **平台**：仅桌面端；Web 端 `requireDesktop()` 之外不暴露；fake repository 补分类 mock。
- **性能**：分类筛选内存同步计算，不增加 IPC 调用。
- **图标**：「添加到分类」菜单图标 `category` 需加入 `scripts/icon-glyphs.txt` 并跑
  `scripts/subset-material-symbols.sh` + `src/iconFontAssets.test.ts` 回归。
- **无障碍**：多选面板支持方向键 + 空格勾选 + Esc 关闭，与项目现有键盘交互风格一致。

## 11. 测试策略

- **Service**：分类名校验各分支、`buildCategoryList` 默认类别计数派生、迁移后空字段补全。
- **Store**：`applyFilter` 分类过滤（含默认类别特判）、增删改、重名与保留字校验、
  `deleteSkill` 清理映射。
- **组件**：`SkillCategoryTree` 菜单项与默认类别不可操作；`SkillCategoryAssignPanel` 多选与即时持久化；
  `SkillCard` pills 展示与溢出、菜单挂载面板。

## 12. 验收清单

- [ ] 侧栏 Agents 下方出现分类区，默认类别置顶且不可操作。
- [ ] 新增 / 重命名 / 删除分类均按校验规则工作。
- [ ] 卡片菜单「添加到分类」多选即时生效。
- [ ] 卡片展示分类 pills，点击可筛选。
- [ ] 分类筛选与搜索 / 收藏 / Agent 工具筛选 AND 组合正确。
- [ ] 删除分类只解除指派，不删 Skill；删除 Skill 清理映射。
- [ ] `schemaVersion` 迁移正确，旧配置可平滑升级。
- [ ] 四语言 i18n 齐全；`category` 图标入字体子集。
- [ ] `npm run test` / `type-check` / `lint` / `build` 全绿。
