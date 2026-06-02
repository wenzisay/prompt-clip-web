/**
 * Prompt 状态管理
 */

import { create } from 'zustand';
import type { Prompt, PromptFilter } from '@/types/prompt';
import { SearchService } from '@/services/searchService';

interface PromptState {
  /** 所有 Prompts */
  prompts: Prompt[];
  /** 当前筛选后的 Prompts */
  filteredPrompts: Prompt[];
  /** 当前筛选条件 */
  filter: PromptFilter;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载错误 */
  error: string | null;

  /** 设置所有 Prompts */
  setPrompts: (prompts: Prompt[]) => Promise<void>;
  /** 添加 Prompt */
  addPrompt: (prompt: Prompt) => void;
  /** 更新 Prompt */
  updatePrompt: (prompt: Prompt) => void;
  /** 静默补全单条 prompt 的 content（不触发 applyFilter） */
  patchPromptContent: (promptId: string, content: string) => void;
  /** 删除 Prompt */
  deletePrompt: (promptId: string) => void;
  /** 切换收藏状态 */
  togglePinned: (promptId: string) => void;
  /** 设置筛选条件 */
  setFilter: (filter: Partial<PromptFilter>) => void;
  /** 清除筛选条件 */
  clearFilter: () => void;
  /** 清空 Prompts */
  clearPrompts: () => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
  /** 应用筛选（内部方法） */
  applyFilter: () => Promise<void>;
}

let filterGeneration = 0;

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  filteredPrompts: [],
  filter: {
    searchQuery: '',
    tag: undefined,
    favoritesOnly: false,
    recentOnly: false,
  },
  isLoading: false,
  error: null,

  setPrompts: async (prompts) => {
    set({ prompts, isLoading: false });
    // 首屏场景：prompts 多为 isContentLoaded=false，仅索引 title+tags；后台 lazyLoader 后续补 content
    const allLoaded = prompts.every((p) => p.isContentLoaded);
    if (allLoaded) {
      await SearchService.buildSearchIndex(prompts);
    } else {
      await SearchService.buildSearchIndex(prompts, { skipContent: true });
    }
    get().applyFilter();
  },

  addPrompt: (prompt) => {
    set((state) => ({ prompts: [...state.prompts, prompt] }));
    SearchService.addToIndex(prompt);
    get().applyFilter();
  },

  updatePrompt: (prompt) => {
    set((state) => ({
      prompts: state.prompts.map((p) =>
        p.id === prompt.id ? prompt : p
      ),
    }));
    SearchService.updateIndex(prompt);
    get().applyFilter();
  },

  patchPromptContent: (promptId, content) => {
    let didPatch = false;
    set((state) => {
      const prompts = state.prompts.map((p) => {
        if (p.id !== promptId || p.isContentLoaded) {
          return p;
        }
        didPatch = true;
        return { ...p, content, isContentLoaded: true };
      });
      if (!didPatch) {
        return state;
      }
      const filteredPrompts = state.filteredPrompts.map((p) =>
        p.id === promptId && !p.isContentLoaded
          ? { ...p, content, isContentLoaded: true }
          : p
      );
      return { prompts, filteredPrompts };
    });
  },

  deletePrompt: (promptId) => {
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== promptId),
    }));
    SearchService.removeFromIndex(promptId);
    get().applyFilter();
  },

  togglePinned: (promptId) => {
    set((state) => ({
      prompts: state.prompts.map((p) => {
        if (p.id !== promptId) {
          return p;
        }

        const pinned = !p.pinned;
        return {
          ...p,
          pinned,
          pinnedAt: pinned ? new Date() : undefined,
        };
      }),
    }));
    const prompt = get().prompts.find((p) => p.id === promptId);
    if (prompt) {
      SearchService.updateIndex(prompt);
    }
    get().applyFilter();
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
    get().applyFilter();
  },

  clearFilter: () => {
    set({
      filter: {
        searchQuery: '',
        tag: undefined,
        favoritesOnly: false,
        recentOnly: false,
      },
    });
    get().applyFilter();
  },

  clearPrompts: () => {
    SearchService.clearSearchIndex();
    set({
      prompts: [],
      filteredPrompts: [],
      filter: {
        searchQuery: '',
        tag: undefined,
        favoritesOnly: false,
        recentOnly: false,
      },
      isLoading: false,
      error: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // 应用当前筛选条件
  applyFilter: async () => {
    const { prompts, filter } = get();
    const currentGeneration = filterGeneration + 1;
    filterGeneration = currentGeneration;
    const searchQuery = filter.searchQuery?.trim() ?? '';
    let result = searchQuery
      ? await SearchService.search(searchQuery)
      : [...prompts];

    if (currentGeneration !== filterGeneration) {
      return;
    }

    if (filter.tag) {
      result = result.filter((p) =>
        p.tags.some((t) => t === filter.tag || t.startsWith(`${filter.tag}/`))
      );
    }

    // 仅收藏
    if (filter.favoritesOnly) {
      result = result.filter((p) => p.pinned);
    }

    if (!searchQuery) {
      result = sortPromptsForFilter(result, filter);
    }

    set({ filteredPrompts: result });
  },
}));

function sortPromptsForFilter(prompts: Prompt[], filter: PromptFilter): Prompt[] {
  if (filter.favoritesOnly) {
    return prompts.sort((a, b) => getPinnedTime(b) - getPinnedTime(a));
  }

  if (filter.recentOnly) {
    return prompts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  return prompts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function getPinnedTime(prompt: Prompt): number {
  return (prompt.pinnedAt ?? prompt.updatedAt).getTime();
}
