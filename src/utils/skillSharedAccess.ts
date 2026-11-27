import type { AgentTool, SkillSummary, SkillToolState, SkillToolStatus } from '@/types/skill';

/** 通用 `~/.agents/skills` 对应的内置工具 id。 */
export const SHARED_AGENTS_SKILLS_TOOL_ID = 'agents-skills';

export type SkillToolAvailability = 'direct' | 'shared' | 'both' | 'none';

/**
 * 判断某个工具状态是否视为「对该工具可用 / 已启用」。
 * 与筛选器、侧边栏计数保持一致：排除 disabled、broken 与无状态记录。
 */
export function isSkillStatusActive(status?: SkillToolStatus): boolean {
  return !!status && status !== 'disabled' && status !== 'broken';
}

/**
 * 判断通用 Agents Skills 工具当前是否可用。
 * 若 tools 列表中包含 agents-skills，则要求其已安装且未被用户在设置中停用；
 * 若 tools 列表未包含 agents-skills（例如局部单测夹具），则回退由 skill.toolStates 判定。
 */
function canInheritFromSharedAgentsSkills(tool: AgentTool, tools: AgentTool[]): boolean {
  if (!tool.readsSharedAgentsSkills || tool.id === SHARED_AGENTS_SKILLS_TOOL_ID) {
    return false;
  }
  const sharedTool = tools.find((item) => item.id === SHARED_AGENTS_SKILLS_TOOL_ID);
  if (sharedTool) {
    if (!sharedTool.installed || !sharedTool.enabled) {
      return false;
    }
    // 若该工具本身与 agents-skills 指向同一物理目录，则属于直接目录，不算继承
    if (sharedTool.targetGroupId === tool.targetGroupId) {
      return false;
    }
  }
  return true;
}

/**
 * 计算某个 Skill 在指定 Agent 工具下的可用来源：
 * - direct：仅通过该工具专属目录启用
 * - shared：仅通过通用 Agents Skills（~/.agents/skills）生效
 * - both：在工具专属目录与 Agents Skills 中同时启用
 * - none：对该工具不可用
 */
export function getSkillAvailabilityForTool(
  skill: SkillSummary,
  tool: AgentTool,
  tools: AgentTool[]
): SkillToolAvailability {
  const direct = isSkillStatusActive(skill.toolStates[tool.id]?.status);
  const shared =
    canInheritFromSharedAgentsSkills(tool, tools) &&
    isSkillStatusActive(skill.toolStates[SHARED_AGENTS_SKILLS_TOOL_ID]?.status);

  if (direct && shared) return 'both';
  if (direct) return 'direct';
  if (shared) return 'shared';
  return 'none';
}

/** 判断 Skill 是否对该 Agent 工具可用（包含直接启用与来自通用 Agents Skills）。 */
export function isSkillAvailableForTool(
  skill: SkillSummary,
  tool: AgentTool,
  tools: AgentTool[]
): boolean {
  return getSkillAvailabilityForTool(skill, tool, tools) !== 'none';
}

/**
 * 判断点击启用该工具专属目录时，是否应弹出「已通过 Agents Skills 生效」的防重复轻确认。
 */
export function shouldWarnDuplicateSharedEnable(
  skill: SkillSummary,
  tool: AgentTool,
  state: SkillToolState,
  tools: AgentTool[]
): boolean {
  if (state.status !== 'disabled') {
    return false;
  }
  if (!canInheritFromSharedAgentsSkills(tool, tools)) {
    return false;
  }
  return isSkillStatusActive(skill.toolStates[SHARED_AGENTS_SKILLS_TOOL_ID]?.status);
}
