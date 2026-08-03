import { create } from 'zustand';
import { SkillService } from '@/services/skillService';
import type {
  AgentTool,
  ExternalScanResult,
  ExternalImportSelection,
  InvalidSkillEntry,
  SkillManagerError,
  SkillDeleteMode,
  SkillScanResponse,
  SkillSummary,
} from '@/types/skill';

interface SkillFilter {
  searchQuery: string;
  favoritesOnly: boolean;
  /** 选中的 Agent 工具 id，null 表示不按 Agent 筛选 */
  agentToolId: string | null;
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
  setAgentToolFilter: (toolId: string | null) => void;
  setError: (error: SkillManagerError | null) => void;
  toggleFavorite: (skillId: string) => Promise<void>;
  deleteSkill: (skillId: string, mode: SkillDeleteMode) => Promise<boolean>;
  setToolEnabled: (
    skillId: string,
    targetGroupId: string,
    enabled: boolean,
    force?: boolean
  ) => Promise<void>;
  addCustomTool: (name: string, skillsPath: string) => Promise<boolean>;
  removeCustomTool: (toolId: string) => Promise<boolean>;
  setToolEnabledState: (toolId: string, enabled: boolean) => Promise<boolean>;
  reorderTools: (toolOrder: string[]) => Promise<boolean>;
  reset: () => void;
  applyFilter: () => void;
}

const INITIAL_FILTER: SkillFilter = {
  searchQuery: '',
  favoritesOnly: false,
  agentToolId: null,
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
    let response: SkillScanResponse | null = null;
    for (const selection of selections) {
      try {
        // 每次导入命令在 Rust 侧同步完成「写入 + 重新扫描 hub」并返回最新快照，
        // 避免跨 IPC 重新读取在 Windows 上读到陈旧的目录枚举（首次导入尤甚）。
        response = await SkillService.importExternal(selection);
      } catch (error) {
        importErrors.push(
          normalizeError(error, { skillId: selection.skillId })
        );
      }
    }
    if (response) {
      set({
        skillsPath: response.skillsPath,
        skills: response.skills,
        tools: response.tools,
        invalidEntries: response.invalidEntries,
        scanErrors: [...response.errors, ...importErrors],
        externalScan: null,
      });
      get().applyFilter();
    } else {
      // 全部导入失败：仍刷新一次以保持状态一致，并合并错误
      await get().load();
      set((state) => ({
        scanErrors: [...state.scanErrors, ...importErrors],
        externalScan: null,
      }));
    }
  },

  setSearchQuery: (searchQuery) => {
    set((state) => ({ filter: { ...state.filter, searchQuery } }));
    get().applyFilter();
  },

  setFavoritesOnly: (favoritesOnly) => {
    // 切换 全部/收藏 pill 时清除 Agent 筛选（对标 prompt 区切换 pill 清除 tag）
    set((state) => ({
      filter: { ...state.filter, favoritesOnly, agentToolId: null },
    }));
    get().applyFilter();
  },

  setAgentToolFilter: (toolId) => {
    set((state) => ({
      filter: {
        ...state.filter,
        agentToolId: state.filter.agentToolId === toolId ? null : toolId,
      },
    }));
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

  addCustomTool: async (name, skillsPath) => {
    set({ error: null });
    try {
      const response = await SkillService.addCustomTool(name, skillsPath);
      applyScanResponse(set, response);
      get().applyFilter();
      return true;
    } catch (error) {
      set({ error: normalizeError(error) });
      return false;
    }
  },

  removeCustomTool: async (toolId) => {
    set({ error: null });
    try {
      const response = await SkillService.removeCustomTool(toolId);
      // 删除工具后，若当前 Agent 筛选指向被删工具，清除筛选避免空列表
      if (get().filter.agentToolId === toolId) {
        set((state) => ({ filter: { ...state.filter, agentToolId: null } }));
      }
      applyScanResponse(set, response);
      get().applyFilter();
      return true;
    } catch (error) {
      set({ error: normalizeError(error) });
      return false;
    }
  },

  setToolEnabledState: async (toolId, enabled) => {
    set({ error: null });
    try {
      const response = await SkillService.setToolEnabledState(toolId, enabled);
      // 关闭的 Agent 若正作为筛选条件，清除筛选（其 skill 状态已从 tool_states 移除）
      if (!enabled && get().filter.agentToolId === toolId) {
        set((state) => ({ filter: { ...state.filter, agentToolId: null } }));
      }
      applyScanResponse(set, response);
      get().applyFilter();
      return true;
    } catch (error) {
      set({ error: normalizeError(error) });
      return false;
    }
  },

  reorderTools: async (toolOrder) => {
    set({ error: null });
    try {
      const response = await SkillService.reorderTools(toolOrder);
      applyScanResponse(set, response);
      get().applyFilter();
      return true;
    } catch (error) {
      set({ error: normalizeError(error) });
      return false;
    }
  },

  reset: () => set({ ...INITIAL_STATE, filter: { ...INITIAL_FILTER } }),

  applyFilter: () => {
    const { skills, filter } = get();
    const query = filter.searchQuery.trim().toLocaleLowerCase();
    const agentToolId = filter.agentToolId;
    const filteredSkills = skills
      .filter((skill) => !filter.favoritesOnly || skill.favoritedAt !== null)
      .filter((skill) => {
        if (!agentToolId) return true;
        const status = skill.toolStates[agentToolId]?.status;
        // 仅保留对该 Agent 已启用 / 同步中的 Skill（排除 disabled/broken/无记录）
        return !!status && status !== 'disabled' && status !== 'broken';
      })
      .filter((skill) => !query || skill.name.toLocaleLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name));
    set({ filteredSkills });
  },
}));

/** 将一次 skill_scan 返回的快照写回 store。供 add/remove/set-enabled 等 IPC 复用。 */
function applyScanResponse(
  set: (
    partial:
      | Partial<SkillState>
      | ((state: SkillState) => Partial<SkillState>)
  ) => void,
  response: SkillScanResponse
): void {
  set({
    skillsPath: response.skillsPath,
    skills: response.skills,
    tools: response.tools,
    invalidEntries: response.invalidEntries,
    scanErrors: response.errors,
  });
}

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
