# Spec: 工作区元数据路径调整

## Objective

调整 PromptClip 在用户工作区内写入的配置、批注、附件、历史版本和回收站路径，将原本散落在工作区根目录的隐藏文件或隐藏目录集中到 `_promptclip/` 目录下。

目标是降低同步工具忽略根目录隐藏文件或隐藏目录带来的困扰，让用户更容易发现 PromptClip 的工作区级元数据，同时保持历史版本和回收站在 `_promptclip/` 内部仍为点目录。

本应用当前尚未上线，因此本规格不包含旧路径兼容、旧数据读取或迁移逻辑。

## Assumptions

1. 不需要读取、迁移或删除旧路径数据。
2. 新版本只写入新路径。
3. `_promptclip/` 是 PromptClip 工作区元数据的唯一根目录。
4. `.history` 和 `.trash` 保持点目录，但移动到 `_promptclip/` 内部。
5. `_promptclip/` 不参与用户 Prompt 主列表扫描。
6. 这是纯前端文件路径调整，不引入后端、数据库、路由或新依赖。

## Path Changes

| 旧位置 | 新位置 |
|---|---|
| `.promptclip.json` | `_promptclip/promptclip.config.json` |
| `.promptclip/annotations/` | `_promptclip/annotations/` |
| `.promptclip/assets/` | `_promptclip/assets/` |
| `.history/` | `_promptclip/.history/` |
| `.trash/` | `_promptclip/.trash/` |

说明：

- 回收站路径统一使用 `_promptclip/.trash/`，不是 `_promptcip/.trash/`。
- 配置文件命名使用 `promptclip.config.json`，避免根目录点文件。
- 批注附件 JSON 中保存的附件 `path` 必须使用新路径。

## Scope

### Must Implement

- 更新文件系统路径常量。
- 更新文件夹配置服务读写路径。
- 更新批注 sidecar JSON 读写路径。
- 更新批注图片附件写入路径。
- 更新删除 Prompt 时的回收站路径。
- 更新历史版本创建、读取、清理和恢复时使用的路径。
- 主 Prompt 扫描必须排除 `_promptclip/` 目录。
- 更新服务层和组件测试中的路径断言。
- 更新 README 或相关文档中描述的存储路径。

### Out of Scope

- 旧路径兼容读取。
- 旧路径到新路径的数据迁移。
- 自动清理旧 `.promptclip.json`、`.promptclip/`、`.history/`、`.trash/`。
- 改变历史版本保留数量、清理策略或文件名规则。
- 改变批注 JSON 数据结构版本。
- 改变回收站恢复能力；当前仍只定义删除移动语义。
- 引入新同步机制或文件监听机制。

## Tech Stack

- React 18 + TypeScript。
- Zustand v5 管理状态。
- Tailwind CSS 3.4 编写样式。
- Vitest 编写单元和组件测试。
- 现有 `FileRepository` 抽象负责 Web File System Access API 与 Tauri 文件系统差异。

## Commands

```bash
npm run dev
npm run type-check
npm run lint
npm run test
npm run build
```

## Project Structure

```text
src/constants/config.ts                 # 文件系统路径常量
src/services/folderConfigService.ts     # 工作区配置读写
src/services/annotationService.ts       # 批注和附件读写、删除联动
src/services/promptService.ts           # Prompt 删除、历史版本读写和清理
src/services/fileRepository/            # 文件扫描与目录遍历抽象
src/services/*.test.ts                  # 服务层路径行为测试
README.md                               # 用户可见存储路径说明
```

## Storage Layout

新工作区元数据目录结构：

```text
_promptclip/
  promptclip.config.json
  annotations/
    <promptId>.json
  assets/
    <promptId>/
      <annotationId>/
        <attachmentId>.<ext>
  .history/
    <stableId>.YYYY-MM-DD-HHMMSS.md
  .trash/
    <trashBase>.md
    annotations/
      <trashBase>.json
    assets/
      <trashBase>/
        <annotationId>/
          <attachmentId>.<ext>
```

## Data Rules

### Workspace Config

配置文件路径：

```text
_promptclip/promptclip.config.json
```

JSON 结构保持不变：

```json
{
  "historyVersions": {
    "enabled": false,
    "retentionDays": 30
  },
  "pinnedTags": [],
  "shareAuthorName": ""
}
```

规则：

- 读取配置时只读取 `_promptclip/promptclip.config.json`。
- 文件不存在时返回默认配置。
- 写入配置前确保 `_promptclip/` 目录存在。
- 不读取 `.promptclip.json`。

### Annotations

批注 sidecar 路径：

```text
_promptclip/annotations/<promptId>.json
```

附件路径：

```text
_promptclip/assets/<promptId>/<annotationId>/<attachmentId>.<ext>
```

规则：

- 批注 JSON 数据结构版本保持 `version: 1`。
- 附件 `path` 字段保存相对工作区根目录的新路径。
- 删除单条批注时，删除 `_promptclip/assets/<promptId>/<annotationId>/`。
- 不读取 `.promptclip/annotations/` 或 `.promptclip/assets/`。

### History Versions

历史版本路径：

```text
_promptclip/.history/<stableId>.YYYY-MM-DD-HHMMSS.md
```

规则：

- 只有启用历史版本后才写入该目录。
- 历史版本文件名规则保持不变。
- 历史版本读取只扫描 `_promptclip/.history/` 下符合当前稳定 ID 的 `.md` 文件。
- 历史版本不参与主 Prompt 列表扫描。
- 不读取 `.history/`。

### Trash

回收站路径：

```text
_promptclip/.trash/
```

删除 Prompt 后的结构：

```text
_promptclip/.trash/
  <trashBase>.md
  annotations/
    <trashBase>.json
  assets/
    <trashBase>/
```

规则：

- 删除 Prompt 前确保 `_promptclip/.trash/` 存在。
- 批注 JSON 和附件目录与 Prompt 文件使用相同 `<trashBase>`。
- 不写入 `.trash/`。

## Code Style

遵循项目现有 TypeScript 风格：

- 路径值集中在 `CONFIG.FILE_SYSTEM` 或同等常量中，避免业务代码散落硬编码路径。
- 跨模块导入使用 `@/` 路径别名。
- 服务层导出独立函数，并汇总到 `as const` 服务对象。
- 用户可见文案使用简体中文。
- 不引入不必要抽象，不添加新依赖。

示例：

```typescript
export const CONFIG = {
  FILE_SYSTEM: {
    APP_DATA_DIR: '_promptclip',
    CONFIG_FILE: '_promptclip/promptclip.config.json',
    HISTORY_DIR: '_promptclip/.history',
    TRASH_DIR: '_promptclip/.trash',
    ANNOTATIONS_DIR: '_promptclip/annotations',
    ANNOTATION_ASSETS_DIR: '_promptclip/assets',
  },
} as const;
```

## Testing Strategy

使用 RED/GREEN TDD：

1. 先更新或新增失败测试，断言服务只使用新路径。
2. 实现路径常量和服务读写逻辑。
3. 更新主 Prompt 扫描排除 `_promptclip/` 的测试。
4. 运行完整验证命令。

测试重点：

- `FolderConfigService.writeFolderConfig` 写入 `_promptclip/promptclip.config.json`。
- `FolderConfigService.readFolderConfig` 不读取 `.promptclip.json`。
- 创建批注写入 `_promptclip/annotations/<promptId>.json`。
- 上传批注图片写入 `_promptclip/assets/...`，附件 `path` 使用新路径。
- 删除 Prompt 后 `.md`、批注 JSON、附件目录进入 `_promptclip/.trash/`。
- 启用历史版本后，更新 Prompt 写入 `_promptclip/.history/`。
- 历史版本列表只返回 `_promptclip/.history/` 中的匹配文件。
- `loadPrompts` 不加载 `_promptclip/` 下的 `.md` 文件。

最低验证命令：

```bash
npm run test
npm run type-check
npm run lint
npm run build
```

## Boundaries

Always:

- 新写入路径必须使用 `_promptclip/` 根目录。
- `_promptclip/` 必须从主 Prompt 扫描结果中排除。
- 测试必须覆盖配置、批注、附件、历史版本、回收站五类路径。
- 文档中的路径说明必须与代码常量一致。
- 文件操作失败时不得静默吞掉异常，除非现有业务语义明确允许降级。

Ask first:

- 是否把 `.history` 或 `.trash` 改成非点目录。
- 是否添加旧路径兼容读取或迁移。
- 是否改变批注 JSON 版本号。
- 是否调整历史版本保留策略。
- 是否新增同步工具相关配置文件。

Never:

- 不读取或迁移旧路径数据。
- 不同时写入新旧两套路径。
- 不把 `_promptclip/` 下的 `.md` 文件展示为用户 Prompt。
- 不跳过、禁用或删除失败测试。
- 不引入后端、数据库、路由或新依赖。

## Success Criteria

1. 新建或更新工作区配置后，只生成 `_promptclip/promptclip.config.json`。
2. 新建批注后，只生成 `_promptclip/annotations/<promptId>.json`。
3. 新增批注图片后，只生成 `_promptclip/assets/...`，并且 JSON 中附件路径为新路径。
4. 启用历史版本并编辑 Prompt 后，只生成 `_promptclip/.history/<stableId>.<timestamp>.md`。
5. 删除 Prompt 后，Prompt 文件、批注 JSON 和附件目录进入 `_promptclip/.trash/`。
6. `_promptclip/` 下的历史版本或回收站 `.md` 文件不会出现在 Prompt 列表中。
7. 旧路径 `.promptclip.json`、`.promptclip/`、`.history/`、`.trash/` 不再被新代码读写。
8. README 或相关用户文档展示的新路径与实现一致。
9. `npm run test`、`npm run type-check`、`npm run lint`、`npm run build` 通过。

## Open Questions

无。当前决策为：

- 不做旧数据兼容与迁移。
- `.history` 和 `.trash` 保持点目录。
- 回收站路径使用 `_promptclip/.trash/`。
