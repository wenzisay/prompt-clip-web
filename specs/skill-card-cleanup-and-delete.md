# Spec: Skill 卡片精简与安全删除

## Objective

精简 Skill 列表卡片，减少重复状态文字，把收藏、导出 ZIP 和删除集中到右上角操作
菜单，并提供不会误删 Agent 独立内容的删除流程。

## Acceptance Criteria

1. Agent 图标继续显示状态徽标和可访问名称，但不再显示“已启用 / 未启用”等文字。
2. 卡片右上角只常驻显示：已收藏 Skill 的黄色实心星标，以及更多操作按钮。
3. 更多操作菜单包含收藏/取消收藏、导出 ZIP、删除，并遵循 Prompt 卡片菜单的交互模式：
   卡片内点击不打开详情、点击外部关闭、打开时提高卡片层级。
4. 卡片最小高度从 `190px` 增加约三分之一至 `254px`。
5. 删除前检测所有已安装 Agent 目标；只有状态为 `enabled` 或 `stale` 的 PromptClip
   管理目标视为“正在使用”。
6. Skill 未在 Agent 中使用时，确认后只删除 PromptClip Hub 原件。
7. Skill 正在 Agent 中使用时，确认弹窗提供两个明确操作：
   - 全部删除：删除 Hub 原件及所有可验证的 PromptClip 管理目标。
   - 仅从 PromptClip 删除：保留 Agent 目标；软链接和 Windows junction 先转换为独立目录，
     文件复制目标保持为独立副本。
8. `conflict`、`broken` 和未知目录不属于可自动删除目标；删除命令不得覆盖或删除它们。
9. 删除成功后从列表移除 Skill，并清理其收藏记录；失败时保留可见错误状态并重新扫描。
10. 所有新增用户可见文字提供 `zh-CN`、`zh-TW`、`en-US`、`ja-JP` 四种翻译。

## Tech Stack

- React 18 + TypeScript + Zustand 5
- Tauri 2 + Rust
- Tailwind CSS 3.4
- Vitest 2 + Testing Library；Rust 内置测试

## Commands

```bash
npm run test -- --run
npm run type-check
npm run lint
npm run build
cd src-tauri && cargo test skills
```

## Project Structure

- `src/components/skill/`：卡片菜单和删除确认 UI
- `src/services/skillService.ts`：Tauri 删除命令适配
- `src/stores/skillStore.ts`：删除后的列表状态与错误处理
- `src/types/skill.ts`：删除模式与结果契约
- `src/i18n/messages.ts`：四语言文案
- `src-tauri/src/skills/`：安全删除、链接物化和文件操作

## Code Style

沿用现有命名导出、无状态 Service 和 Zustand action 模式：

```typescript
export async function deleteSkill(
  skillId: string,
  mode: SkillDeleteMode
): Promise<SkillDeleteResult> {
  return invoke('skill_delete', { skillId, mode });
}
```

Rust 删除逻辑只接受经过 `validate_skill_id` 和现有目标检查的路径，不跟随未知链接。

## Testing Strategy

- 组件测试：菜单内容、收藏星标、移除状态文字、菜单事件隔离、删除弹窗分支。
- Store/Service 测试：命令参数与删除后重新加载行为。
- Rust 单元测试：无目标删除、全部删除、保留复制目标、软链接物化、冲突目标不改写。
- 浏览器验证：卡片高度、菜单定位、图标密度、可访问名称、控制台错误。

## Boundaries

- Always：删除前检查目标所有权；软链接物化完成后才删除 Hub；失败显式返回错误。
- Ask first：改变 `conflict` / `broken` 的处理策略；删除未知目录；新增依赖。
- Never：跟随链接递归删除；静默吞掉部分失败；为通过测试跳过或禁用测试。

## Assumptions

1. “正在 Agent 中使用”限定为 `enabled` 或 `stale` 的 PromptClip 管理目标。
2. Windows junction 与软链接采用相同的保留策略，转换为独立目录。
3. 共享同一 `targetGroupId` 的工具只处理一次物理目标。
4. 复制目标保留时不重新复制；它已经是物理目录。

## Open Questions

- 无。用户已确认删除边界。
