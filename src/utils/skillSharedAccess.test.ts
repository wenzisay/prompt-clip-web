import { describe, expect, it } from 'vitest';
import type { AgentTool, SkillSummary, SkillToolStatus } from '@/types/skill';
import {
  getSkillAvailabilityForTool,
  isSkillAvailableForTool,
  isSkillStatusActive,
  shouldWarnDuplicateSharedEnable,
} from './skillSharedAccess';

function makeTool(
  id: string,
  overrides: Partial<AgentTool> = {}
): AgentTool {
  return {
    id,
    name: id,
    installed: true,
    detectionReasons: ['config'],
    configPath: `/home/.${id}`,
    skillsPath: `/home/.${id}/skills`,
    targetGroupId: `group:${id}`,
    syncMode: 'inherit',
    effectiveSyncMode: 'symlink',
    copyOnly: false,
    iconId: id,
    source: 'builtin',
    enabled: true,
    readsSharedAgentsSkills: false,
    ...overrides,
  };
}

function makeSkill(
  states: Record<string, SkillToolStatus>
): SkillSummary {
  return {
    id: 'demo-skill',
    name: 'demo-skill',
    description: 'Demo skill',
    relativePath: 'demo-skill',
    contentHash: 'hash',
    favoritedAt: null,
    categoryIds: [],
    toolStates: Object.fromEntries(
      Object.entries(states).map(([toolId, status]) => [
        toolId,
        {
          toolId,
          targetGroupId: `group:${toolId}`,
          status,
          actualMode: status === 'disabled' ? null : 'symlink',
          message: null,
        },
      ])
    ),
  };
}

describe('skillSharedAccess', () => {
  const codex = makeTool('codex', { readsSharedAgentsSkills: true });
  const claude = makeTool('claude-code', { readsSharedAgentsSkills: false });
  const agents = makeTool('agents-skills', { readsSharedAgentsSkills: false });
  const allTools = [claude, codex, agents];

  it('treats enabled, stale, conflict, and pending statuses as active', () => {
    expect(isSkillStatusActive('enabled')).toBe(true);
    expect(isSkillStatusActive('stale')).toBe(true);
    expect(isSkillStatusActive('conflict')).toBe(true);
    expect(isSkillStatusActive('pending')).toBe(true);
    expect(isSkillStatusActive('disabled')).toBe(false);
    expect(isSkillStatusActive('broken')).toBe(false);
    expect(isSkillStatusActive(undefined)).toBe(false);
  });

  it('classifies direct, shared, both, and none for compatible tools', () => {
    expect(
      getSkillAvailabilityForTool(
        makeSkill({ codex: 'enabled', 'agents-skills': 'disabled' }),
        codex,
        allTools
      )
    ).toBe('direct');

    expect(
      getSkillAvailabilityForTool(
        makeSkill({ codex: 'disabled', 'agents-skills': 'enabled' }),
        codex,
        allTools
      )
    ).toBe('shared');

    expect(
      getSkillAvailabilityForTool(
        makeSkill({ codex: 'stale', 'agents-skills': 'enabled' }),
        codex,
        allTools
      )
    ).toBe('both');

    expect(
      getSkillAvailabilityForTool(
        makeSkill({ codex: 'disabled', 'agents-skills': 'broken' }),
        codex,
        allTools
      )
    ).toBe('none');
  });

  it('never inherits shared skills for incompatible tools or agents-skills itself', () => {
    const sharedOnly = makeSkill({
      'claude-code': 'disabled',
      'agents-skills': 'enabled',
    });

    expect(getSkillAvailabilityForTool(sharedOnly, claude, allTools)).toBe('none');
    expect(isSkillAvailableForTool(sharedOnly, claude, allTools)).toBe(false);
    expect(getSkillAvailabilityForTool(sharedOnly, agents, allTools)).toBe('direct');
  });

  it('stops inheriting when agents-skills tool is disabled or uninstalled', () => {
    const sharedOnly = makeSkill({ codex: 'disabled', 'agents-skills': 'enabled' });
    const disabledAgents = { ...agents, enabled: false };
    const uninstalledAgents = { ...agents, installed: false };

    expect(
      getSkillAvailabilityForTool(sharedOnly, codex, [codex, disabledAgents])
    ).toBe('none');
    expect(
      getSkillAvailabilityForTool(sharedOnly, codex, [codex, uninstalledAgents])
    ).toBe('none');
  });

  it('warns about duplicate enable only when enabling a disabled compatible tool already active via agents-skills', () => {
    const sharedOnly = makeSkill({
      codex: 'disabled',
      'claude-code': 'disabled',
      'agents-skills': 'enabled',
    });

    expect(
      shouldWarnDuplicateSharedEnable(sharedOnly, codex, sharedOnly.toolStates.codex, allTools)
    ).toBe(true);
    expect(
      shouldWarnDuplicateSharedEnable(
        sharedOnly,
        claude,
        sharedOnly.toolStates['claude-code'],
        allTools
      )
    ).toBe(false);

    const alreadyEnabled = makeSkill({ codex: 'enabled', 'agents-skills': 'enabled' });
    expect(
      shouldWarnDuplicateSharedEnable(
        alreadyEnabled,
        codex,
        alreadyEnabled.toolStates.codex,
        allTools
      )
    ).toBe(false);

    const sharedBroken = makeSkill({ codex: 'disabled', 'agents-skills': 'broken' });
    expect(
      shouldWarnDuplicateSharedEnable(
        sharedBroken,
        codex,
        sharedBroken.toolStates.codex,
        allTools
      )
    ).toBe(false);
  });
});
