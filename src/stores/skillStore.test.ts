import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AgentTool,
  SkillCategory,
  SkillManagerSettings,
  SkillScanResponse,
  SkillSummary,
} from '@/types/skill';

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  scanExternal: vi.fn(),
  setEnabled: vi.fn(),
  forceEnable: vi.fn(),
  setFavorite: vi.fn(),
  delete: vi.fn(),
  initialize: vi.fn(),
  addCategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
  setSkillCategories: vi.fn(),
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
  source: 'builtin',
  enabled: true,
};

function skill(id: string, favoritedAt: string | null = null): SkillSummary {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: id,
    contentHash: `${id}-hash`,
    favoritedAt,
    categoryIds: [],
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

  describe('agent tool filter', () => {
    function skillForAgent(id: string, codexStatus: SkillSummary['toolStates'][string]['status'] | undefined) {
      const base = skill(id);
      if (codexStatus === undefined) {
        delete base.toolStates.codex;
      } else {
        base.toolStates.codex.status = codexStatus;
      }
      return base;
    }

    it('keeps only skills enabled/syncing for the selected agent', async () => {
      mocks.scan.mockResolvedValue(
        scanResponse([
          skillForAgent('enabled', 'enabled'),
          skillForAgent('stale', 'stale'),
          skillForAgent('pending', 'pending'),
          skillForAgent('conflict', 'conflict'),
          skillForAgent('disabled', 'disabled'),
          skillForAgent('broken', 'broken'),
          skillForAgent('absent', undefined),
        ])
      );
      await useSkillStore.getState().load();

      useSkillStore.getState().setAgentToolFilter('codex');

      expect(useSkillStore.getState().filteredSkills.map((item) => item.id).sort()).toEqual([
        'conflict',
        'enabled',
        'pending',
        'stale',
      ]);
    });

    it('toggles the same agent off and clears the filter', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skillForAgent('enabled', 'enabled')]));
      await useSkillStore.getState().load();

      useSkillStore.getState().setAgentToolFilter('codex');
      useSkillStore.getState().setAgentToolFilter('codex');

      expect(useSkillStore.getState().filter.agentToolId).toBeNull();
      expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual(['enabled']);
    });

    it('clears the agent filter when switching the all/favorites pill', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skillForAgent('enabled', 'enabled')]));
      await useSkillStore.getState().load();

      useSkillStore.getState().setAgentToolFilter('codex');
      useSkillStore.getState().setFavoritesOnly(false);

      expect(useSkillStore.getState().filter.agentToolId).toBeNull();
      expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual(['enabled']);
    });
  });

  describe('categories', () => {
    const category: SkillCategory = {
      id: 'c1',
      name: 'Work',
      createdAt: '2026-08-01T00:00:00Z',
    };

    function settingsWith(
      overrides: Partial<SkillManagerSettings> = {}
    ): SkillManagerSettings {
      return {
        schemaVersion: 1,
        defaultSyncMode: 'symlink',
        toolOverrides: {},
        favorites: {},
        customTools: [],
        disabledToolIds: [],
        toolOrder: [],
        categories: [category],
        skillCategories: {},
        ...overrides,
      };
    }

    function skillInCategory(id: string, categoryIds: string[] = []): SkillSummary {
      return { ...skill(id), categoryIds };
    }

    it('filters by category and combines with search (AND)', async () => {
      mocks.scan.mockResolvedValue(
        scanResponse([
          skillInCategory('alpha', ['c1']),
          skillInCategory('beta', ['c1']),
          skillInCategory('gamma'),
        ])
      );
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith({
          skillCategories: { alpha: ['c1'], beta: ['c1'] },
        }),
        settingsWarnings: [],
        tools: [codex],
      });
      await useSkillStore.getState().load();

      useSkillStore.getState().setCategoryFilter('c1');
      expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual([
        'alpha',
        'beta',
      ]);

      // AND with search
      useSkillStore.getState().setSearchQuery('alph');
      expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual(['alpha']);
    });

    it('default category includes only unassigned skills', async () => {
      mocks.scan.mockResolvedValue(
        scanResponse([
          skillInCategory('assigned', ['c1']),
          skillInCategory('loose'),
        ])
      );
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith({ skillCategories: { assigned: ['c1'] } }),
        settingsWarnings: [],
        tools: [codex],
      });
      await useSkillStore.getState().load();

      useSkillStore.getState().setCategoryFilter('__default__');
      expect(useSkillStore.getState().filteredSkills.map((item) => item.id)).toEqual(['loose']);
    });

    it('toggles the same category off', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skillInCategory('alpha')]));
      await useSkillStore.getState().load();

      useSkillStore.getState().setCategoryFilter('c1');
      expect(useSkillStore.getState().filter.category).toBe('c1');
      useSkillStore.getState().setCategoryFilter('c1');
      expect(useSkillStore.getState().filter.category).toBeNull();
    });

    it('treats all/favorites/agent/category as mutually exclusive', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skillInCategory('alpha', ['c1'])]));
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith({ skillCategories: { alpha: ['c1'] } }),
        settingsWarnings: [],
        tools: [codex],
      });
      await useSkillStore.getState().load();

      // 选分类 → 清空 favorites/agent
      useSkillStore.getState().setCategoryFilter('c1');
      expect(useSkillStore.getState().filter).toMatchObject({
        category: 'c1',
        favoritesOnly: false,
        agentToolId: null,
      });

      // 选 agent → 清空分类/favorites
      useSkillStore.getState().setAgentToolFilter('codex');
      expect(useSkillStore.getState().filter).toMatchObject({
        category: null,
        favoritesOnly: false,
        agentToolId: 'codex',
      });

      // 选收藏 → 清空 agent/分类
      useSkillStore.getState().setFavoritesOnly(true);
      expect(useSkillStore.getState().filter).toMatchObject({
        category: null,
        favoritesOnly: true,
        agentToolId: null,
      });

      // 选全部 → 清空 favorites/分类/agent
      useSkillStore.getState().setFavoritesOnly(false);
      expect(useSkillStore.getState().filter).toMatchObject({
        category: null,
        favoritesOnly: false,
        agentToolId: null,
      });
    });

    it('adds a category via service and syncs settings', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skill('alpha')]));
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith({ categories: [] }),
        settingsWarnings: [],
        tools: [codex],
      });
      mocks.addCategory.mockResolvedValue(settingsWith({ categories: [category] }));
      await useSkillStore.getState().load();

      const ok = await useSkillStore.getState().addCategory('Work');
      expect(ok).toBe(true);
      expect(mocks.addCategory).toHaveBeenCalledWith('Work');
      expect(useSkillStore.getState().categories).toEqual([category]);
    });

    it('deletes a category, releases assignments, and clears active filter', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skillInCategory('alpha', ['c1'])]));
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith({ skillCategories: { alpha: ['c1'] } }),
        settingsWarnings: [],
        tools: [codex],
      });
      // 删除后 Rust 返回空分类 + 空指派
      mocks.deleteCategory.mockResolvedValue(
        settingsWith({ categories: [], skillCategories: {} })
      );
      await useSkillStore.getState().load();
      useSkillStore.getState().setCategoryFilter('c1');

      const ok = await useSkillStore.getState().deleteCategory('c1');
      expect(ok).toBe(true);
      expect(mocks.deleteCategory).toHaveBeenCalledWith('c1');
      expect(useSkillStore.getState().categories).toEqual([]);
      // 当前筛选指向被删分类 → 应被清空
      expect(useSkillStore.getState().filter.category).toBeNull();
      // 前端 skill 的 categoryIds 也应被清理
      expect(useSkillStore.getState().skills[0].categoryIds).toEqual([]);
    });

    it('assigns categories to a skill and updates local state', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skill('alpha')]));
      mocks.initialize.mockResolvedValue({
        skillsPath: '/home/.prompt-clip/skills',
        settings: settingsWith(),
        settingsWarnings: [],
        tools: [codex],
      });
      mocks.setSkillCategories.mockResolvedValue(
        settingsWith({ skillCategories: { alpha: ['c1'] } })
      );
      await useSkillStore.getState().load();

      const ok = await useSkillStore.getState().setSkillCategories('alpha', ['c1']);
      expect(ok).toBe(true);
      expect(mocks.setSkillCategories).toHaveBeenCalledWith('alpha', ['c1']);
      expect(useSkillStore.getState().skills[0].categoryIds).toEqual(['c1']);
    });

    it('propagates category errors and returns false', async () => {
      mocks.scan.mockResolvedValue(scanResponse([skill('alpha')]));
      mocks.addCategory.mockRejectedValue({ code: 'skill_category_name_duplicate', params: {} });
      await useSkillStore.getState().load();

      const ok = await useSkillStore.getState().addCategory('dup');
      expect(ok).toBe(false);
      expect(useSkillStore.getState().error?.code).toBe('skill_category_name_duplicate');
    });
  });
});
