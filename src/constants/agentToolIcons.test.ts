import { describe, expect, it } from 'vitest';
import { AGENT_TOOL_ICONS, getAgentToolIcon } from './agentToolIcons';

describe('agentToolIcons', () => {
  it('bundles icons for the core builtin targets', () => {
    const ids = Object.keys(AGENT_TOOL_ICONS);
    // 核心工具必须存在图标
    for (const core of ['agents-skills', 'claude-code', 'codex', 'cursor', 'opencode']) {
      expect(ids).toContain(core);
    }
    // 迁移自 Skills-Manager 的扩展工具抽样校验
    for (const expanded of [
      'gemini',
      'windsurf',
      'cline',
      'kilo-code',
      'zencoder',
      'hermes',
      'workbuddy',
    ]) {
      expect(ids).toContain(expanded);
    }
    expect(getAgentToolIcon('codex')).toMatch(/codex\.svg$/);
  });

  it('uses the generic Agents icon for future unknown tools', () => {
    expect(getAgentToolIcon('future-tool')).toBe(AGENT_TOOL_ICONS['agents-skills']);
  });
});
