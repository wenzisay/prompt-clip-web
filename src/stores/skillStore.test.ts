import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool, SkillScanResponse, SkillSummary } from '@/types/skill';

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  scanExternal: vi.fn(),
  setEnabled: vi.fn(),
  forceEnable: vi.fn(),
  setFavorite: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/skillService', () => ({
  SkillService: mocks,
}));

import { useSkillStore } from './skillStore';

const codex: AgentTool = {
  id: 'codex',
  name: 'Codex',
  installed: true,
  detectionReasons: ['config'],
  configPath: '/home/.codex',
  skillsPath: '/home/.codex/skills',
  targetGroupId: 'shared',
  syncMode: 'inherit',
  effectiveSyncMode: 'copy',
  copyOnly: false,
  iconId: 'codex',
};

function skill(id: string, favoritedAt: string | null = null): SkillSummary {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: id,
    contentHash: `${id}-hash`,
    favoritedAt,
    toolStates: {
      codex: {
        toolId: 'codex',
        targetGroupId: 'shared',
        status: 'disabled',
        actualMode: null,
        message: null,
      },
      'agents-skills': {
        toolId: 'agents-skills',
        targetGroupId: 'shared',
        status: 'disabled',
        actualMode: null,
        message: null,
      },
    },
  };
}

function scanResponse(skills: SkillSummary[]): SkillScanResponse {
  return {
    skillsPath: '/home/.prompt-clip/skills',
    skills,
    invalidEntries: [],
    tools: [codex],
    errors: [],
  };
}

describe('skillStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSkillStore.getState().reset();
  });

  it('loads service facts and sorts skills by name', async () => {
    mocks.scan.mockResolvedValue(scanResponse([skill('zeta'), skill('alpha')]));

    await useSkillStore.getState().load();

    expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual([
      'alpha',
      'zeta',
    ]);
  });

  it('combines name search with a separate favorites filter without favorite-time sorting', async () => {
    mocks.scan.mockResolvedValue(
      scanResponse([
        skill('zeta', '2026-08-01T11:00:00.000Z'),
        skill('alpha', '2026-08-01T10:00:00.000Z'),
        skill('beta'),
      ])
    );
    await useSkillStore.getState().load();

    useSkillStore.getState().setFavoritesOnly(true);
    useSkillStore.getState().setSearchQuery('a');

    expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual([
      'alpha',
      'zeta',
    ]);
  });

  it('updates every tool sharing the returned target group after toggle', async () => {
    mocks.scan.mockResolvedValue(scanResponse([skill('review')]));
    mocks.setEnabled.mockResolvedValue({
      targetGroupId: 'shared',
      toolIds: ['codex', 'agents-skills'],
      state: { status: 'enabled', actualMode: 'copy', message: null },
    });
    await useSkillStore.getState().load();

    await useSkillStore.getState().setToolEnabled('review', 'shared', true);

    const states = useSkillStore.getState().skills[0].toolStates;
    expect(states.codex.status).toBe('enabled');
    expect(states['agents-skills'].status).toBe('enabled');
  });

  it('uses force enable and updates the group after confirmed takeover', async () => {
    const conflicted = skill('review');
    conflicted.toolStates.codex.status = 'conflict';
    mocks.scan.mockResolvedValue(scanResponse([conflicted]));
    mocks.forceEnable.mockResolvedValue({
      targetGroupId: 'shared',
      toolIds: ['codex', 'agents-skills'],
      state: { status: 'enabled', actualMode: 'copy', message: null },
    });
    await useSkillStore.getState().load();

    await useSkillStore.getState().setToolEnabled('review', 'shared', true, true);

    expect(mocks.forceEnable).toHaveBeenCalledWith({
      skillId: 'review',
      targetGroupId: 'shared',
    });
    expect(useSkillStore.getState().skills[0].toolStates.codex.status).toBe('enabled');
  });

  it('persists favorite state and keeps alphabetical order', async () => {
    mocks.scan.mockResolvedValue(scanResponse([skill('zeta'), skill('alpha')]));
    mocks.setFavorite.mockResolvedValue({
      schemaVersion: 1,
      defaultSyncMode: 'copy',
      toolOverrides: {},
      favorites: { zeta: '2026-08-01T12:00:00.000Z' },
    });
    await useSkillStore.getState().load();

    await useSkillStore.getState().toggleFavorite('zeta');
    useSkillStore.getState().setFavoritesOnly(true);

    expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual(['zeta']);
    expect(mocks.setFavorite).toHaveBeenCalledWith('zeta', expect.stringMatching(/Z$/));
  });

  it('removes a skill after deleting only the Hub version', async () => {
    mocks.scan.mockResolvedValue(scanResponse([skill('review'), skill('write')]));
    mocks.delete.mockResolvedValue(undefined);
    await useSkillStore.getState().load();

    const deleted = await useSkillStore.getState().deleteSkill('review', 'hubOnly');

    expect(deleted).toBe(true);
    expect(mocks.delete).toHaveBeenCalledWith('review', 'hubOnly');
    expect(useSkillStore.getState().skills.map((item) => item.id)).toEqual(['write']);
  });

  it('keeps the skill visible and exposes an error when deletion fails', async () => {
    mocks.scan.mockResolvedValue(scanResponse([skill('review')]));
    mocks.delete.mockRejectedValue({ code: 'skill_delete_failed', params: {} });
    await useSkillStore.getState().load();

    const deleted = await useSkillStore.getState().deleteSkill('review', 'all');

    expect(deleted).toBe(false);
    expect(useSkillStore.getState().skills.map((item) => item.id)).toEqual(['review']);
    expect(useSkillStore.getState().error?.code).toBe('skill_delete_failed');
    expect(mocks.scan).toHaveBeenCalledTimes(2);
  });
});
