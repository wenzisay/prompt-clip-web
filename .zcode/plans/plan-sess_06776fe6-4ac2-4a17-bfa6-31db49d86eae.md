## 问题

导入是串行多次 IPC（每个 selection 一次 `skill_import_external`），有肉眼可见的延迟。当前 `confirmImport` 在导入开始**前**就 `setImportOpen(false)` 关闭弹窗，导入在后台静默进行，用户既看不到"正在导入"，也无法区分"还没完成"还是"导入失败"。

## 修复方案（弹窗内 loading）

保持导入弹窗在导入期间打开，"确认导入"按钮变为 loading 状态，禁用关闭路径，导入完成后才关闭弹窗。遵循项目现有 `isSubmitting` 模式（`SkillCreateModal` / `SkillDeleteModal` / `SkillSettingsModal` 均用本地 `isSubmitting` 状态 + `isSubmitting` prop）。

## 改动清单

### 1. `src/i18n/messages.ts`（4 语言）
新增一个 key `importing`（"正在导入…" / "Importing…" 等），紧跟 `confirmImport` 之后（zh-CN:379、zh-TW:883、en-US:1401、ja-JP:1923）。复用现有 `close` key 关闭按钮文案。

| key | zh-CN | zh-TW | en-US | ja-JP |
|---|---|---|---|---|
| `importing` | 正在导入… | 正在匯入… | Importing… | 読み込み中… |

### 2. `src/components/skill/SkillManagerPage.tsx`
- 新增本地状态 `const [isImporting, setImporting] = useState(false)`（紧邻现有 `isSubmitting`，:45）。
- 改 `confirmImport`（:80-83）：**不在开头关闭弹窗**，改为 `setImporting(true)` → `await importExternalSelections(selections)` → finally `setImporting(false)` + `setImportOpen(false)`。导入失败也走 finally（弹窗仍关闭，错误已由 store 的 `scanErrors`/`error` 处理）。
- 给 `<SkillImportModal>`（:251-260）传 `isImporting={isImporting}`。
- `onClose` 仍为 `setImportOpen(false)`；导入中 modal 内部会忽略关闭（见下）。

```tsx
const confirmImport = async (selections: ExternalImportSelection[]) => {
  setImporting(true);
  try {
    await importExternalSelections(selections);
  } finally {
    setImporting(false);
    setImportOpen(false);
  }
};
```

### 3. `src/components/skill/SkillImportModal.tsx`
- Props 新增 `isImporting?: boolean`（默认 false，对齐 `SkillCreateModal` 的 `isSubmitting?` 可选约定）。
- 顶部关闭 X 按钮（:166-173）：`onClick` 改为 `isImporting ? undefined : onClose`，并加 `disabled={isImporting}` + `disabled:opacity-40 disabled:cursor-not-allowed`。导入中不可关闭，避免半途而废的歧义。
- 底部按钮区（:242-249）：
  - "关闭"按钮：同样 `disabled={isImporting}`。
  - "确认导入"按钮：`disabled={isImporting}`，文案在 `isImporting` 时显示 `t.skills.importing` + 内联 `<Spinner size="sm" color="white" />`，否则 `t.skills.confirmImport`。用 `inline-flex items-center gap-2` 排版。

```tsx
<button type="button" onClick={confirm} disabled={isImporting}
  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
  {isImporting && <Spinner size="sm" color="white" />}
  {isImporting ? t.skills.importing : t.skills.confirmImport}
</button>
```

导入 `Spinner` from `@/components/common`。

### 4. 测试
**`SkillManagerPage.test.tsx`**（:80-83 附近是 confirmImport，但当前测试只覆盖 delete/sidebar/initialize，未测 import flow）：
- 该测试文件 mock 了 `importExternalSelections`，无需改动现有用例。
- 可选新增一个测试：mock `importExternalSelections` 返回一个可控 promise，点击确认后断言按钮进入 loading（但此测试需渲染 SkillImportModal——而该文件 mock 了 SkillGrid 等，未 mock SkillImportModal，理论上可测）。**默认不新增**，保持与现状一致的测试粒度，避免引入复杂时序 mock；如实现中发现成本低则补一个。

**`SkillImportModal.test.tsx`**：
- 新增 `disables close and confirm while importing`：传 `isImporting`，断言"确认导入"按钮 `disabled` 且文案为 `Importing…`（en-US 测试环境），关闭 X 与底部"关闭"按钮均 `disabled`。

### 5. 不动
- `skillStore.ts`：不加 `isImporting` 全局状态（本地状态足够，符合项目 isSubmitting 惯例）。
- `skillService.ts`、后端：无改动。
- `Spinner` 组件：直接复用。

## 设计权衡

- 选本地 `isImporting` 而非 store flag：导入是 `SkillManagerPage` 局部交互，且项目已有 `isSubmitting` 惯例（CreateModal/DeleteModal/SettingsModal 全用本地状态），保持一致。
- 导入中禁用关闭：避免用户中途关闭导致"导入未完成"的歧义——正是本次要解决的问题。导入完成/失败后 finally 都关闭弹窗，错误通过 store 现有机制（`scanErrors`/`error`）呈现。
- 弹窗保持打开：用户始终在导入上下文中，列表在弹窗背后更新（弹窗关闭瞬间列表已就绪），视觉上"导入完成 → 弹窗消失 → 列表已有新 skill"一气呵成。

## 验证清单
- `npm run test -- --run src/components/skill/SkillImportModal.test.tsx`
- `npm run test -- --run src/components/skill/SkillManagerPage.test.tsx`
- `npm run test -- --run src/i18n/messages.test.ts`
- `npm run type-check && npm run lint`
- 全量 `npm run test -- --run` 回归