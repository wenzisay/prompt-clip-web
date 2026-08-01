import { describe, expect, it } from 'vitest';
import { AGENT_TOOL_ICONS, getAgentToolIcon } from './agentToolIcons';

describe('agentToolIcons', () => {
  it('maps all five initial targets to bundled SVG assets', () => {
    expect(Object.keys(AGENT_TOOL_ICONS).sort()).toEqual([
      'agents-skills',
      'claude-code',
      'codex',
      'cursor',
      'opencode',
    ]);
    expect(getAgentToolIcon('codex')).toMatch(/codex\.svg$/);
  });

  it('uses the generic Agents icon for future unknown tools', () => {
    expect(getAgentToolIcon('future-tool')).toBe(AGENT_TOOL_ICONS['agents-skills']);
  });
});
