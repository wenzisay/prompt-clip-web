## 实现方案：参照 Prompt 标签筛选模式，侧边栏展示 Agents 列表筛选 Skills

### 设计思路
把 Agent 对标 Prompt 的「标签」：
- **侧边栏**（Skills 区域）展示 Agents 列表（带图标，可点击）—— 对标 prompt 区的 `TagTree`。
- **点击某个 Agent** → 写入 store 筛选状态 → 列表页上方筛选项后面追加一个已选 chip（显示 agent 图标 + 名称，选中态）—— 对标 prompt 区 `FilterTabs` 里的 `selectedTag` chip。
- **列表过滤**：只显示对该 agent 处于已启用/同步中状态（enabled/stale/pending/conflict，排除 disabled/broken/无记录）的 Skills。
- **清除筛选**：完全对标 prompt 区——chip 本身**不加关闭按钮**，通过「切换 全部/收藏 pill 时自动清除 agent 筛选」实现（与 prompt 的 `handleFilterChange` 里 `tag: undefined` 一致）。

### 改动文件

**1. `src/stores/skillStore.ts`**（筛选状态，对标 promptStore 的 `filter.tag`）
- `SkillFilter` 新增字段：`agentToolId: string | null`。
- `INITIAL_FILTER` 增加默认值 `agentToolId: null`。
- `SkillState` 接口新增 action：`setAgentToolFilter: (toolId: string | null) => void`，仿 `setFavoritesOnly`（set filter + `applyFilter()`）。
- `setFavoritesOnly` / `setSearchQuery` 改为在切换时一并清除 `agentToolId`（对标 prompt `handleFilterChange` 里 `tag: undefined`），使切换 pill 即清除 agent 筛选。
- `applyFilter()` 新增过滤分支：
  ```ts
  if (filter.agentToolId) {
    const status = skill.toolStates[filter.agentToolId]?.status;
    return !!status && status !== 'disabled' && status !== 'broken';
  }
  ```
- `reset()` 无需改动（已整体重置为 `INITIAL_FILTER`）。

**2. `src/components/layout/Sidebar.tsx`**（侧边栏 Agents 列表，对标 TagTree 区域）
- 导入 `useSkillStore` 和 `getAgentToolIcon`。
- 把现在 Skills 区中间的占位 `<div className="flex-1" />`（第 103 行）替换为：当 `!isPromptSection && !isCollapsed` 时渲染一个 Agents 列表区，结构对标第 92-101 行的标签树区：
  - 标题行 `t.skills.agents`（如「Agents」）。
  - 列表项：每项一行，左侧 agent 图标（`<img src={getAgentToolIcon(tool.iconId)}>`，放在 `bg-accent-soft` 圆角小框里，沿用 SkillCard 的图标容器样式），右侧 agent 名。
  - 仅列出 `tool.installed === true` 的项。
  - 点击 → `setAgentToolFilter(tool.id)`；再次点击同一项 → 清除（`setAgentToolFilter(null)`）。
  - 选中态样式：`bg-accent-soft text-accent`（对标 `TreeNode`）；未选中 `hover:bg-surface-dim`。
  - 空列表（无已安装 agent）时显示一句提示文案 `t.skills.noAgents`，保留标题，保持侧边栏结构稳定。
- 保留底部已有的「同步设置」按钮。

**3. `src/components/skill/SkillFilterTabs.tsx`**（列表页上方筛选，对标 FilterTabs 的 selectedTag chip）
- 从 store 读取 `filter`、`tools`、`setFavoritesOnly`。
- 在两个 pill（全部/收藏）后面，当 `filter.agentToolId` 存在时，追加一个**纯展示**的选中态 chip（**无关闭按钮**）：
  - 样式沿用 FilterTabs 的 chip（`bg-accent text-white rounded-full`），内容为 agent 图标 + agent 名。
  - 通过 `tools.find(t => t.id === filter.agentToolId)` 拿到 agent 名和 iconId。
- 当 agent 筛选激活时，「全部/收藏」pill 的 active 判定加上 `!filter.agentToolId` 前置条件（对标 prompt `isActive = !selectedTag && activeTab === tab.value`），让 chip 视觉上接管选中态。
- 切换 pill 时由 store 自动清除 agent 筛选（见文件 1）。

**4. `src/i18n/messages.ts`**（四语言新增文案，加在 `t.skills` 块内，紧跟 `favorites` 之后）
- `agents`：列表标题「Agents」（四种语言均用「Agents」）。
- `noAgents`：空提示。
  - zh-CN：`未检测到已安装的 Agent` / zh-TW：`未偵測到已安裝的 Agent` / en：`No installed agents detected` / ja：`インストールされた Agent が見つかりません`。
- 四个语言块（zh-CN ~343 行、zh-TW ~813 行、en ~1297 行、ja ~1783 行）同步添加。

**5. 测试更新**
- `src/stores/skillStore.test.ts`：新增 `setAgentToolFilter` + `applyFilter` 用例（构造带不同 `toolStates` 的 skills：enabled 命中、disabled/broken 排除、无记录排除、null 清空；并验证切换 favoritesOnly 会清除 agent 筛选）。
- `src/components/layout/Sidebar.test.tsx`（已存在）：新增用例——Skills 区渲染 Agents 列表；点击某 agent 后 store.filter.agentToolId 更新且该项高亮；再次点击同一项清除。
- `src/components/skill/SkillFilterTabs.test.tsx`：新增用例——设置 agentToolId 后渲染带 agent 名的 chip；切换「全部/收藏」pill 后 agentToolId 被清除、chip 消失。

### 字体图标
- 本次 UI 用到的 Material Symbols 图标均已存在于现有清单中（agent 标题无图标，侧边栏列表项无额外图标）。`close` 不再使用。Agent 图标走 SVG（`getAgentToolIcon`），与字体无关。
- 如最终实现确认无新增 ligature，则无需运行字体子集化脚本；若有新增则运行 `bash scripts/subset-material-symbols.sh` 并提交字体与清单。

### 验收
- `npm run type-check`、`npm run lint`。
- `npm run test -- --run src/stores/skillStore.test.ts src/components/layout/Sidebar.test.tsx src/components/skill/SkillFilterTabs.test.tsx`。
- 手动验证（或浏览器测试）：侧边栏点 agent → 上方出现 chip + 列表过滤；点「全部/收藏」pill → 清除筛选、chip 消失。