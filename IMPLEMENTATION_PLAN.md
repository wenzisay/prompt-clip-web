# Implementation Plan: 工作区元数据路径调整

对应 `docs/工作区元数据路径调整-SPEC.md`。目标是把 PromptClip 工作区元数据统一移动到 `_promptclip/` 下，不做旧路径兼容或迁移。

## 阶段 1: 路径常量与配置文件

**目标**: 将工作区配置从 `.promptclip.json` 改为 `_promptclip/promptclip.config.json`，并集中定义新的元数据路径常量。

**成功标准**:
- `CONFIG.FILE_SYSTEM` 中的配置、批注、附件、历史版本、回收站路径全部指向 `_promptclip/`。
- `FolderConfigService` 只读写 `_promptclip/promptclip.config.json`。
- 写配置前确保 `_promptclip/` 目录存在。
- 不读取 `.promptclip.json`。

**测试**:
- `folderConfigService.test.ts` 断言读取、写入、更新配置均使用 `_promptclip/promptclip.config.json`。
- 增加旧 `.promptclip.json` 存在时仍返回默认配置的测试。

**状态**: 已完成

---

## 阶段 2: 批注、附件与回收站路径

**目标**: 将批注 JSON、附件二进制、删除联动回收站路径切换到 `_promptclip/`。

**成功标准**:
- 批注 sidecar 写入 `_promptclip/annotations/<promptId>.json`。
- 批注附件写入 `_promptclip/assets/<promptId>/<annotationId>/...`。
- 删除 Prompt 时，Prompt 文件、批注 JSON、附件目录进入 `_promptclip/.trash/`。
- 不读写 `.promptclip/` 或 `.trash/`。

**测试**:
- `annotationService.test.ts` 更新创建、附件、删除联动路径断言。
- `promptService.test.ts` 更新删除 Prompt 和批注联动回收站路径断言。

**状态**: 已完成

---

## 阶段 3: 历史版本路径与 Prompt 扫描排除

**目标**: 将历史版本目录切换到 `_promptclip/.history/`，并确保 `_promptclip/` 下的 `.md` 不进入主 Prompt 列表。

**成功标准**:
- 启用历史版本后写入 `_promptclip/.history/<stableId>.<timestamp>.md`。
- 历史版本读取、清理、恢复只使用 `_promptclip/.history/`。
- `loadPrompts` 和稳定 ID 收集不加载 `_promptclip/` 下的 `.md`。

**测试**:
- `promptService.test.ts` 更新历史版本创建、读取、清理断言。
- 增加 `_promptclip/.history/*.md` 和 `_promptclip/.trash/*.md` 不进入主 Prompt 列表的测试。

**状态**: 已完成

---

## 阶段 4: 文档与完整验证

**目标**: 更新用户文档中的存储路径，并通过完整质量门禁。

**成功标准**:
- README 中所有工作区元数据路径与新实现一致。
- 代码中不再存在旧路径的业务读写常量。
- `npm run test`、`npm run type-check`、`npm run lint`、`npm run build` 全部通过。

**测试**:
- 使用 `rg` 检查旧路径残留，确认只保留历史说明或明确排除项。
- 运行完整验证命令。

**状态**: 已完成
