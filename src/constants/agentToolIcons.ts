import agentsSkillsIcon from '@/assets/agents/agents-skills.svg';
import claudeCodeIcon from '@/assets/agents/claude-code.svg';
import codexIcon from '@/assets/agents/codex.svg';
import cursorIcon from '@/assets/agents/cursor.svg';
import openCodeIcon from '@/assets/agents/opencode.svg';

export const AGENT_TOOL_ICONS: Readonly<Record<string, string>> = {
  'agents-skills': agentsSkillsIcon,
  'claude-code': claudeCodeIcon,
  codex: codexIcon,
  cursor: cursorIcon,
  opencode: openCodeIcon,
};

export function getAgentToolIcon(iconId: string): string {
  return AGENT_TOOL_ICONS[iconId] ?? agentsSkillsIcon;
}
