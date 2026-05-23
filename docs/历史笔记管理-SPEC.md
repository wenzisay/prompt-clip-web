# Spec: 历史笔记管理

## Objective

在笔记详情查看页增加历史版本入口。用户点击入口后，打开历史笔记管理弹窗：

- 左侧显示当前笔记的历史版本列表，包含可读的编辑时间信息。
- 右侧显示选中历史版本的笔记内容。
- 历史版本支持复制内容。
- 历史版本支持恢复为当前笔记。
- 执行恢复时，恢复前的当前笔记必须先保存为一个新的历史版本。
- 恢复成功后关闭历史弹窗，详情页直接显示已恢复的版本。

目标用户是使用 PromptClip 管理本地 Markdown 笔记的个人用户。成功状态是用户可以从详情页快速查看、复制、恢复历史版本，并且恢复操作不会丢失恢复前的当前内容。

## Assumptions

1. 历史版本仍存储在工作区 `.history/` 目录，沿用现有稳定 ID 文件名规则：
   `.history/<stableId>.YYYY-MM-DD-HHMMSS.md`。
2. 历史列表的“编辑时间”优先使用历史文件记录的时间信息；如历史文件 frontmatter 中存在
   `modified` 字段，预览区可显示该字段，否则使用文件 `modifiedAt`。
3. 恢复历史版本时恢复正文、标题、标签、收藏状态、复制次数等可序列化 metadata，但保持当前
   Prompt 的稳定 `id` 与当前文件路径语义不变。
4. 如果恢复后的标题与文件名不一致，默认遵循现有 `PromptService.updatePrompt` 行为，必要时按标题
   重命名当前笔记文件。
5. 复制历史内容只复制 Markdown 正文，不复制 YAML frontmatter。
6. 这是纯前端功能，不引入后端、数据库、路由或新持久化系统。

## Tech Stack

- React 18 + TypeScript。
- Zustand v5 管理状态。
- Tailwind CSS 3.4 编写样式。
- Material Symbols Outlined 作为图标来源。
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
src/types/                    # Prompt、历史版本相关类型
src/services/promptService.ts # 历史版本读取、内容解析、恢复逻辑
src/stores/promptStore.ts     # 恢复后更新当前 Prompt 与搜索索引
src/components/layout/        # 详情页历史入口
src/components/prompt/        # 历史管理弹窗组件
src/utils/                    # Markdown、日期、ID 等纯函数
```

建议新增或调整的文件：

```text
src/components/prompt/HistoryModal.tsx
src/components/prompt/HistoryModal.test.tsx
```

如服务层逻辑扩展较多，可在保持现有导出风格的前提下继续放在
`src/services/promptService.ts`，避免过早拆分。

## Code Style

遵循项目现有 TypeScript/React 风格：

- 组件使用函数式组件和命名导出。
- 跨模块导入使用 `@/` 别名。
- 服务层导出独立函数，并汇总到 `PromptService`。
- 用户可见文案使用简体中文。
- 样式使用 Tailwind utility class。
- 不引入不必要抽象，不添加新依赖，保持实现平直可读。

示例：

```typescript
export interface HistoryVersion {
  filename: string;
  editedAt: Date;
  title: string;
  content: string;
}

export async function restoreHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt,
  historyFilename: string
): Promise<Prompt> {
  await createHistoryVersion(repository, workspace, prompt);
  const version = await loadHistoryVersion(repository, workspace, prompt.id, historyFilename);

  return updatePrompt(repository, workspace, prompt, {
    id: prompt.id,
    title: version.title,
    content: version.content,
    tags: version.tags,
  }, { createHistory: false });
}
```

## Testing Strategy

使用 RED/GREEN TDD：

1. 服务层测试先覆盖历史版本读取和恢复语义。
2. 组件测试覆盖详情入口、历史列表渲染、复制按钮和恢复后弹窗关闭。
3. 手动验证覆盖真实 UI 交互和详情页刷新效果。

测试重点：

- `getHistoryVersions` 或新增 API 返回历史版本列表时包含编辑时间，并按时间倒序。
- 读取历史版本时解析 Markdown frontmatter 和正文。
- 恢复历史版本前会先为当前 Prompt 创建历史版本。
- 恢复成功后返回的 Prompt 仍保留原稳定 `id`。
- 恢复成功后 store 中的 Prompt 被更新，详情页显示恢复后的内容。
- 非稳定 ID、缺失工作区、历史文件读取失败时不静默吞错，UI 显示错误。

最低验证命令：

```bash
npm run test
npm run type-check
npm run lint
npm run build
```

## Boundaries

Always:

- 遵循现有架构依赖方向：types → constants → utils → services → stores → hooks → components。
- 恢复前必须保存当前笔记为历史版本。
- 恢复后必须更新 Zustand store 和搜索索引。
- 历史弹窗关闭后，详情页继续打开并展示恢复后的当前笔记。
- 所有新增用户可见文案使用简体中文。
- 测试行为，不测试实现细节。

Ask first:

- 是否恢复 `copyCount`、`pinned`、`pinnedAt` 等非内容字段。
- 是否需要恢复到历史版本的原文件标题并触发文件重命名。
- 是否需要删除某个历史版本或清空历史版本。
- 是否需要在恢复前弹二次确认。
- 是否改变历史版本保留数量或 `.history/` 存储结构。
- 是否引入新的 UI 组件库或 Markdown diff 库。

Never:

- 不引入后端、数据库或路由。
- 不跳过、禁用或删除失败测试。
- 不静默吞掉恢复、复制、读取历史失败。
- 不修改用户无关文件或重置未确认的工作区改动。
- 不把历史版本写入当前笔记目录的可见列表中。

## Success Criteria

1. 详情页元数据区域或标题操作区出现历史版本图标入口，图标有可访问标签和 hover title。
2. 点击历史入口后打开历史笔记管理弹窗。
3. 弹窗左侧展示当前笔记历史版本列表，每项至少包含编辑时间。
4. 选择历史版本后，右侧展示该历史版本的标题、编辑时间、字符数和正文内容。
5. 点击复制后，将选中历史版本正文写入剪贴板，并给出成功或失败反馈。
6. 点击恢复后：
   - 当前笔记先被保存为新的历史版本。
   - 当前笔记内容替换为选中历史版本。
   - 弹窗关闭。
   - 详情页立即展示恢复后的版本。
   - 搜索索引与列表数据同步更新。
7. 无历史版本时显示空状态，不报错。
8. 文件读取、恢复失败时显示错误状态，不关闭弹窗。
9. `npm run test`、`npm run type-check`、`npm run lint`、`npm run build` 通过。

## Open Questions

请确认以下范围后再进入实现：

1. 恢复历史版本时，是否要恢复标题和标签，还是只恢复正文内容？
2. 恢复历史版本时，是否要恢复收藏状态、复制次数等 metadata？
3. 恢复前是否需要二次确认，还是按你的描述点击后直接恢复并关闭弹窗？
4. 右侧内容区只需要纯 Markdown 预览，还是需要像详情页一样渲染 Markdown？
5. 历史列表时间使用历史文件的编辑时间是否可接受？
