import { create } from 'zustand';
import { SkillService } from '@/services/skillService';
import type {
  AgentTool,
  ExternalScanResult,
  ExternalImportSelection,
  InvalidSkillEntry,
  SkillManagerError,
  SkillDeleteMode,
  SkillSummary,
} from '@/types/skill';

interface SkillFilter {
  searchQuery: string;
  favoritesOnly: boolean;
}

interface SkillState {
  skillsPath: string;
  skills: SkillSummary[];
  filteredSkills: SkillSummary[];
  tools: AgentTool[];
  invalidEntries: InvalidSkillEntry[];
  scanErrors: SkillManagerError[];
  externalScan: ExternalScanResult | null;
  filter: SkillFilter;
  isLoading: boolean;
  isScanningExternal: boolean;
  pendingTargetGroups: string[];
  error: SkillManagerError | null;
  load: () => Promise<void>;
  rescanExternal: () => Promise<void>;
  importExternalSelections: (selections: ExternalImportSelection[]) => Promise<void>;
  setSearchQuery: (searchQuery: string) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  setError: (error: SkillManagerError | null) => void;
  toggleFavorite: (skillId: string) => Promise<void>;
  deleteSkill: (skillId: string, mode: SkillDeleteMode) => Promise<boolean>;
  setToolEnabled: (
    skillId: string,
    targetGroupId: string,
    enabled: boolean,
    force?: boolean
  ) => Promise<void>;
  reset: () => void;
  applyFilter: () => void;
}

const INITIAL_FILTER: SkillFilter = {
  searchQuery: '',
  favoritesOnly: false,
};

const INITIAL_STATE = {
  skillsPath: '',
  skills: [] as SkillSummary[],
  filteredSkills: [] as SkillSummary[],
  tools: [] as AgentTool[],
  invalidEntries: [] as InvalidSkillEntry[],
  scanErrors: [] as SkillManagerError[],
  externalScan: null as ExternalScanResult | null,
  filter: INITIAL_FILTER,
  isLoading: false,
  isScanningExternal: false,
  pendingTargetGroups: [] as string[],
  error: null as SkillManagerError | null,
};

export const useSkillStore = create<SkillState>()((set, get) => ({
  ...INITIAL_STATE,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await SkillService.scan();
      set({
        skillsPath: response.skillsPath,
        skills: response.skills,
        tools: response.tools,
        invalidEntries: response.invalidEntries,
        scanErrors: response.errors,
        isLoading: false,
      });
      get().applyFilter();
    } catch (error) {
      set({ isLoading: false, error: normalizeError(error) });
    }
  },

  rescanExternal: async () => {
    set({ isScanningExternal: true, error: null });
    try {
      const externalScan = await SkillService.scanExternal();
      set({ externalScan, isScanningExternal: false });
    } catch (error) {
      set({ isScanningExternal: false, error: normalizeError(error) });
    }
  },

  importExternalSelections: async (selections) => {
    const importErrors: SkillManagerError[] = [];
    for (const selection of selections) {
      try {
        await SkillService.importExternal(selection);
      } catch (error) {
        importErrors.push(
          normalizeError(error, { skillId: selection.skillId })
        );
      }
    }
    await get().load();
    set((state) => ({
      externalScan: null,
      scanErrors: [...state.scanErrors, ...importErrors],
    }));
  },

  setSearchQuery: (searchQuery) => {
    set((state) => ({ filter: { ...state.filter, searchQuery } }));
    get().applyFilter();
  },

  setFavoritesOnly: (favoritesOnly) => {
    set((state) => ({ filter: { ...state.filter, favoritesOnly } }));
    get().applyFilter();
  },

  setError: (error) => set({ error }),

  toggleFavorite: async (skillId) => {
    const skill = get().skills.find((item) => item.id === skillId);
    if (!skill) return;
    const favoritedAt = skill.favoritedAt ? null : new Date().toISOString();
    set({ error: null });
    try {
      const settings = await SkillService.setFavorite(skillId, favoritedAt);
      set((state) => ({
        skills: state.skills.map((item) => ({
          ...item,
          favoritedAt: settings.favorites[item.id] ?? null,
        })),
      }));
      get().applyFilter();
    } catch (error) {
      set({ error: normalizeError(error) });
    }
  },

  deleteSkill: async (skillId, mode) => {
    set({ error: null });
    try {
      await SkillService.delete(skillId, mode);
      set((state) => ({
        skills: state.skills.filter((skill) => skill.id !== skillId),
      }));
      get().applyFilter();
      return true;
    } catch (error) {
      const deletionError = normalizeError(error, { skillId });
      await get().load();
      set({ error: deletionError });
      return false;
    }
  },

  setToolEnabled: async (skillId, targetGroupId, enabled, force = false) => {
    if (get().pendingTargetGroups.includes(targetGroupId)) return;
    const previousSkills = get().skills;
    set((state) => ({
      error: null,
      pendingTargetGroups: [...state.pendingTargetGroups, targetGroupId],
      skills: updateTargetGroup(state.skills, skillId, targetGroupId, {
        status: 'pending',
        actualMode: null,
        message: null,
      }),
    }));
    get().applyFilter();
    try {
      const result = force
        ? await SkillService.forceEnable({ skillId, targetGroupId })
        : await SkillService.setEnabled({ skillId, targetGroupId, enabled });
      set((state) => ({
        pendingTargetGroups: state.pendingTargetGroups.filter(
          (groupId) => groupId !== targetGroupId
        ),
        skills: updateToolIds(state.skills, skillId, result.toolIds, result.state),
      }));
      get().applyFilter();
    } catch (error) {
      set((state) => ({
        skills: previousSkills,
        pendingTargetGroups: state.pendingTargetGroups.filter(
          (groupId) => groupId !== targetGroupId
        ),
        error: normalizeError(error),
      }));
      get().applyFilter();
    }
  },

  reset: () => set({ ...INITIAL_STATE, filter: { ...INITIAL_FILTER } }),

  applyFilter: () => {
    const { skills, filter } = get();
    const query = filter.searchQuery.trim().toLocaleLowerCase();
    const filteredSkills = skills
      .filter((skill) => !filter.favoritesOnly || skill.favoritedAt !== null)
      .filter((skill) => !query || skill.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name));
    set({ filteredSkills });
  },
}));

function updateTargetGroup(
  skills: SkillSummary[],
  skillId: string,
  targetGroupId: string,
  state: Pick<SkillSummary['toolStates'][string], 'status' | 'actualMode' | 'message'>
): SkillSummary[] {
  return skills.map((skill) => {
    if (skill.id !== skillId) return skill;
    return {
      ...skill,
      toolStates: Object.fromEntries(
        Object.entries(skill.toolStates).map(([toolId, toolState]) => [
          toolId,
          toolState.targetGroupId === targetGroupId
            ? { ...toolState, ...state }
            : toolState,
        ])
      ),
    };
  });
}

function updateToolIds(
  skills: SkillSummary[],
  skillId: string,
  toolIds: string[],
  state: Pick<SkillSummary['toolStates'][string], 'status' | 'actualMode' | 'message'>
): SkillSummary[] {
  const ids = new Set(toolIds);
  return skills.map((skill) => {
    if (skill.id !== skillId) return skill;
    return {
      ...skill,
      toolStates: Object.fromEntries(
        Object.entries(skill.toolStates).map(([toolId, toolState]) => [
          toolId,
          ids.has(toolId) ? { ...toolState, ...state } : toolState,
        ])
      ),
    };
  });
}

function normalizeError(
  error: unknown,
  extraParams: Record<string, string> = {}
): SkillManagerError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return {
      code: error.code,
      params: {
        ...('params' in error && typeof error.params === 'object' && error.params !== null
          ? (error.params as Record<string, string>)
          : {}),
        ...extraParams,
      },
    };
  }
  return {
    code: 'skill_unknown_error',
    params: {
      message: error instanceof Error ? error.message : String(error),
      ...extraParams,
    },
  };
}
