## 目标

在 `SkillImportModal` 中：
1. 顶部新增一行汇总文案：`扫描到 N 个 Skills，其中 X 个已存在、Y 个新增`（简洁数字式）。
2. 将扫描到的 groups 按「已存在 / 新增」分成两组渲染，每组带可折叠标题 `▸ 已存在（X）` / `▸ 新增（Y）`。
3. 某一类为 0 时整组隐藏；0 个时仍显示完整汇总数字（N/X/Y）。

`N` = groups 总数；`X` = 与 hub 冲突的 groups 数；`Y` = 新增 groups 数。沿用既有判定 `hasHubVersion`（`name.toLocaleLowerCase() === duplicateKey`），与现有"显示保留 PromptClip 版本"的判定一致。

## 设计细节

### 组件结构改造（`SkillImportModal.tsx`）

在渲染层把 `scan.groups` 拆成两组：

```tsx
const hubNames = useMemo(
  () => new Set(hubSkills.map(s => s.name.toLocaleLowerCase())),
  [hubSkills]
);
const existingGroups = scan.groups.filter(g => hubNames.has(g.duplicateKey));
const newGroups = scan.groups.filter(g => !hubNames.has(g.duplicateKey));
const total = scan.groups.length;
```

（`hubNames` 复用 `useEffect` 里已有的构造逻辑，抽成 `useMemo` 避免重复。）

### 顶部汇总

在 `<div className="space-y-4 overflow-y-auto p-5">` 内、invalid 区块之后、groups 之前插入：

```tsx
<p className="text-sm text-muted">
  {t.skills.importSummary(total, existingGroups.length, newGroups.length)}
</p>
```

> 若 `total === 0`（无可导入 skill，只有 invalid 条目），整段汇总+分组都不渲染，避免显示「扫描到 0 个 Skills」的噪声。

### 可折叠分组

新增一个内部小组件 `CollapsibleGroup`（同文件内，函数式组件，符合 AGENTS.md 约定）：

```tsx
interface CollapsibleGroupProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleGroup({ title, count, collapsed, onToggle, children }: CollapsibleGroupProps) {
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-fg hover:bg-surface-dim"
      >
        <span className="material-symbols-outlined text-[18px] text-muted">
          {collapsed ? 'chevron_right' : 'expand_more'}
        </span>
        <span>{title}</span>
        <span className="text-muted">（{count}）</span>
      </button>
      {!collapsed && <div className="space-y-4">{children}</div>}
    </section>
  );
}
```

图标用 `chevron_right`/`expand_more`，与 `SkillFileTree.tsx:425-426` 既有风格一致。

### 折叠状态管理

两个独立的折叠状态，`useEffect` 中随 `scan` 变化时重置为展开（默认展开，便于用户查看）：

```tsx
const [existingCollapsed, setExistingCollapsed] = useState(false);
const [newCollapsed, setNewCollapsed] = useState(false);
```

放在已有的 `useEffect`(...setChoices) 同一个 effect 里同步重置（已依赖 `[hubSkills, isOpen, scan]`），保持单一数据流。

### 分组渲染

把当前 `{scan.groups.map((group) => ...)}` 的单个 fieldset map，提取成 `renderGroup(group)` 内联函数（返回 `<fieldset>`），然后在两个 `CollapsibleGroup` 里分别 `existingGroups.map(renderGroup)` / `newGroups.map(renderGroup)`。每个 group 的内部单选逻辑（keepHub/useExternal/skip）完全不变。

布局上：invalid 区块 → 汇总文案 → [已存在组 + 已存在 groups] → [新增组 + 新增 groups]。

### i18n（`messages.ts`，四种语言）

新增两个 key（紧跟现有 `importTitle`/`keepHub` 附近）：

- `importSummary: (total: number, existing: number, added: number) => string`
- `existingSkills: '已存在'` / `newSkills: '新增'`（section 标题用，复数由 `（X）` 数字承担）

四语言文案：

| key | zh-CN | zh-TW | en-US | ja-JP |
|---|---|---|---|---|
| `importSummary` | `扫描到 ${total} 个 Skills，其中 ${existing} 个已存在、${added} 个新增` | `掃描到 ${total} 個 Skills，其中 ${existing} 個已存在、${added} 個新增` | `Found ${total} skills: ${existing} already in PromptClip, ${added} new` | `${total} 個の Skills を検出（${existing} 個は既存、${added} 個は新規）` |
| `existingSkills` | `已存在` | `已存在` | `Existing` | `既存` |
| `newSkills` | `新增` | `新增` | `New` | `新規` |

> 「新增」此处指"未在 PromptClip 仓库中"，比"未在仓库"更贴合导入语境（用户动作是导入），也避免与 invalid（扫描失败）混淆。

## 测试（`SkillImportModal.test.tsx`）

1. **新增** `shows summary and groups scanned skills by existing vs new`：构造 2 个 groups（1 个名与 hubSkill 冲突、1 个全新），断言：
   - 汇总文案「Found 2 skills: 1 already in PromptClip, 1 new」出现；
   - 「Existing（1）」标题 + 其下 review-code fieldset；
   - 「New（1）」标题 + 其下新 skill fieldset。
2. **新增** `hides empty group section`：所有 groups 都与 hub 冲突时，「New（0）」section 不渲染。
3. **新增** `collapses and expands a group on header click`：点击「New」标题 → 内部 groups 消失（`aria-expanded=false`），再点 → 恢复。
4. 现有 4 个测试保持通过（默认 keepHub、隐藏 skip、无冲突显示 skip、invalid 展示）。其中「无冲突显示 skip」测试的 hubSkills 为空，正好落入「新增」组，断言不变。

## 字体子集

新增图标 `chevron_right`、`expand_more` 已在 `SkillFileTree.tsx` 使用，应已在 `icon-glyphs.txt` 清单内。实现完成后按 AGENTS.md 要求运行：

```bash
bash scripts/subset-material-symbols.sh
scripts/.venv-fonttools/bin/python scripts/verify-subset.py \
  public/fonts/material-symbols-outlined.woff2 scripts/icon-glyphs.txt
npm run test -- --run src/iconFontAssets.test.ts
npm run build
```

若 `subset-material-symbols.sh` 自动捕获了这两个图标则无需改动；验证脚本会确认 ligature 完整。

## 影响范围

- 改：`src/components/skill/SkillImportModal.tsx`（主要改动）
- 改：`src/components/skill/SkillImportModal.test.tsx`（新增 3 个测试）
- 改：`src/i18n/messages.ts`（4 语言 × 3 key）
- 不动：后端 `scanner.rs` / `import.rs`、`skillService.ts`、`skillStore.ts`、`ImportDecision` 类型 —— 纯 UI 层增强。

## 验证清单

- `npm run test -- --run src/components/skill/SkillImportModal.test.tsx`
- `npm run test -- --run src/iconFontAssets.test.ts`
- `npm run type-check && npm run lint`
- 字体验证脚本通过
- `npm run build`