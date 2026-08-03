## 问题根因

当前 `externalScanError(code)` 只映射了 1 个错误码（`skill_external_link_invalid`），其余约 13 个扫描错误码（`skill_name_mismatch`、`invalid_skill_id`、`skill_markdown_missing`、`skill_frontmatter_invalid` 等）**全部回退成原始 code 字符串**直接显示给用户（如界面上出现 `skill_name_mismatch`）。同时后端已经携带的有用 `params`（如 `directoryName`、`metadataName`、`path`、`skillId`）**完全没被传递和展示**。这就是"提示模糊"的根源。

## 修复方案

1. **重命名并泛化** `externalScanError` → `skillScanError`（中性命名：该错误码/params 结构同时服务于 hub 与外部扫描，便于后续复用）。
2. **改签名** `(code: string)` → `(code: string, params: Record<string, string>)`，对齐 `SkillManagerError.params` 的形状，沿用本仓库既有的"箭头函数 + 定位参数 + `${}` 插值"约定（如 `confirmForceOverwrite(skill, tool, path)`、`importSummary(...)`）。
3. **逐码映射**所有外部扫描可达的错误码，并在有 params 时插值，让提示具体且可操作。
4. **未知码兜底**为一句通用提示（不再显示原始 code）。
5. **更新调用点** `SkillImportModal.tsx:190` 传 `entry.error.params`。

## 完整错误码映射表（4 语言）

下表为英文基线（zh/zh-TW/ja 同义翻译）。params 来自 Rust `with_param(...)` 的 camelCase 键。

| code | params | en-US 文案 |
|---|---|---|
| `invalid_skill_id` | `skillId` | `The directory name "${skillId}" is not a valid skill id (lowercase letters, digits, single hyphens/colons, max 64 chars).` |
| `skill_name_mismatch` | `directoryName`, `metadataName` | `The frontmatter name "${metadataName}" does not match the directory name "${directoryName}".` |
| `skill_markdown_missing` | — | `Missing the skill entry file (SKILL.md).` |
| `skill_markdown_invalid_type` | — | `The skill entry file must be a regular file, not a link.` |
| `skill_source_invalid` | — | `The skill directory is neither a folder nor a valid link.` |
| `skill_external_link_invalid` | `path`(+`message`) | `The symbolic link is broken or does not point to a directory.` （保留现有措辞；path 已在 UI 另显，不重复插值） |
| `skill_frontmatter_missing` | — | `The skill file is missing its YAML frontmatter (must start with "---").` |
| `skill_frontmatter_unclosed` | — | `The YAML frontmatter is not closed (missing a closing "---").` |
| `skill_frontmatter_invalid` | — | `The YAML frontmatter could not be parsed (must contain name and description).` |
| `skill_description_empty` | — | `The skill description is empty.` |
| `skill_content_symlink` | `path` | `The skill contains a symbolic link ("${path}"), which is not allowed.` |
| `skill_content_special_file` | `path` | `The skill contains an unsupported special file ("${path}").` |
| `skill_io_error` | `operation`, `message` | `A file system error occurred while ${operation}: ${message}` |
| `skill_path_outside_root` | — | `The skill directory structure is invalid.` |
| （未知/default） | — | `This skill could not be scanned. Please check its directory structure.` |

> `skill_entry_symlink` 是 hub-only（外部扫描允许顶层符号链接），不纳入；但 `skillScanError` 命名中性，未来若渲染 hub 无效条目可顺手补一行 case。

四语言文案会逐条编写（zh-CN / zh-TW / en-US / ja-JP），`invalidExternalEntries` 汇总文案、`revealExternalPath` 等已有 key 不动。

## 改动清单

### 1. `src/i18n/messages.ts`（4 处）
每处把：
```ts
externalScanError: (code: string) =>
  code === 'skill_external_link_invalid' ? '...' : code,
```
替换为 `skillScanError(code, params)` 的 switch 实现。建议用 `switch (code)` 结构，可读性好且未命中走 default 兜底。例（en-US）：
```ts
skillScanError: (code: string, params: Record<string, string>) => {
  switch (code) {
    case 'invalid_skill_id':
      return `The directory name "${params.skillId ?? ''}" is not a valid skill id ...`;
    case 'skill_name_mismatch':
      return `The frontmatter name "${params.metadataName ?? ''}" does not match the directory name "${params.directoryName ?? ''}".`;
    // ... 其余 case
    default:
      return 'This skill could not be scanned. Please check its directory structure.';
  }
},
```
位置：仍放在各语言 `skills` 块内原 `externalScanError` 处（zh-CN:383、zh-TW:855、en-US:1342、ja-JP:1834）。

### 2. `src/components/skill/SkillImportModal.tsx:190`
```tsx
<span>{t.skills.skillScanError(entry.error.code, entry.error.params)}</span>
```
（唯一调用点；重命名后类型推断自动跟随。）

### 3. 测试 `src/components/skill/SkillImportModal.test.tsx`
- **改** 现有 `'shows external entries that could not be scanned'`：`skill_external_link_invalid` 的断言文案不变（措辞保留），但需确认新函数签名下 params=`{}` 仍返回该文案。
- **新增** `shows a specific message for a name mismatch`：构造 `invalidEntries` 含 `code: 'skill_name_mismatch', params: { directoryName: 'review-code', metadataName: 'ReviewCode' }`，断言显示 `The frontmatter name "ReviewCode" does not match the directory name "review-code".`（en-US 测试环境），并验证 `entry.directoryName` 仍单独展示。
- **新增** `falls back to a generic message for an unknown error code`：`code: 'some_unknown_code', params: {}` → 断言显示兜底句、且**不**显示 `some_unknown_code` 字面量。

### 4. 不动
- 后端 `scanner.rs` / `paths.rs` / `models.rs`：错误码与 params 已完备，无需改。
- `src/types/skill.ts`：`SkillManagerError.params` 已是 `Record<string,string>`，无需改。
- `skillStore.ts`：`normalizeError` 已正确透传 params，无需改。
- `messages.test.ts`：现有断言不涉及 `externalScanError`，不受影响（如需可补一条 `skillScanError('skill_name_mismatch', {...})` 的快照断言，可选）。

## 影响范围与风险

- 纯 i18n + 单个调用点改动，无契约/数据流变化，风险极低。
- 未知码兜底改为通用文案后，理论上丢失了"原始码"的可见性——但用户选择了通用兜底（更友好），且这些码本就是内部技术码，对终端用户无意义。如后续排查需要，后端日志/Rust `Display` 仍输出 code。

## 验证清单
- `npm run test -- --run src/components/skill/SkillImportModal.test.tsx`
- `npm run test -- --run src/i18n/messages.test.ts`（确认未破坏结构一致性断言）
- `npm run type-check && npm run lint`
- （可选）`npm run test -- --run` 全量回归