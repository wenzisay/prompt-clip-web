# PromptClip FSA 命门验证 Spike

验证 **File System Access API 在 Chrome/Edge MV3 侧边栏扩展中的可行性**，对应 `IMPLEMENTATION_PLAN.md` 阶段 0。

## 加载步骤

1. 打开 `chrome://extensions`（或 Edge `edge://extensions`）。
2. 右上角开启 **「开发者模式」**。
3. 点击 **「加载已解压的扩展程序」**，选择本目录 `spike/chrome-extension-fsa/`。
4. 工具栏点击 PromptClip 扩展图标 → 侧边栏打开。

## 验证清单（按 ①②③④ 顺序）

| # | 操作 | 预期 | 验证点 |
|---|------|------|--------|
| ① | 点「side panel 直接选目录」 | **失败**（`AbortError`，#314） | 确认扩展上下文无法直调 picker |
| ② | 点「通过 tab 选目录」→ tab 中点「选择目录」 | tab 内 picker 弹出 → 成功 | tab page context 可触发 picker |
| ③ | 自动触发（或点按钮） | `restoreDirectory` 读回 handle → `listFiles`/`readText`/`writeText` 全 ✅ | tab 写入 → side panel 跨上下文读写闭环 |
| ④ | 点「清空已存 handle」 | 清空 | 便于反复测试 |

> 控制台（side panel：右键→检查；picker tab：F12）可看详细日志与 SW 消息（`chrome://extensions` → 该扩展 → service worker）。

## 关键约束

- **picker 必须由用户在 tab 内点击按钮触发**（tab 导航后 transient activation 丢失，不能自动调用）。
- **IndexedDB 约定**与 `src/services/fileRepository/webFileRepository.ts` 一致（`promptclip-file-handles` / `handles` / `directory`），直接验证复用前提。
- `__spike_test__.md` 为写入测试产物，验证后可删除。

## 预期结论（待实测回填）

- 若 ① 失败 + ②③ 成功 → 命门确认，按 `IMPLEMENTATION_PLAN.md` 决策 D3（tab 方案）推进正式迁移。
- 若 ① 也成功 → Chrome 已修复 #314，正式迁移可直接复用 `webFileRepository.selectDirectory`，无需 tab。
