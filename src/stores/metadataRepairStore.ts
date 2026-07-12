import { create } from 'zustand';
import type { PromptMetadataScanResult } from '@/services/metadataRepairService';

interface MetadataRepairState {
  workspaceId: string | null;
  isOpen: boolean;
  result: PromptMetadataScanResult | null;
  ignoredPaths: Set<string>;
  beginWorkspace: (workspaceId: string) => void;
  show: (result: PromptMetadataScanResult) => void;
  close: () => void;
  clear: () => void;
  ignoreCurrent: () => void;
  reset: () => void;
}

export const useMetadataRepairStore = create<MetadataRepairState>((set, get) => ({
  workspaceId: null,
  isOpen: false,
  result: null,
  ignoredPaths: new Set(),

  beginWorkspace: (workspaceId) => {
    if (workspaceId !== get().workspaceId) {
      set({ workspaceId, isOpen: false, result: null, ignoredPaths: new Set() });
    }
  },

  show: (result) => {
    const issues = result.issues.filter(
      (issue) => !get().ignoredPaths.has(issue.path)
    );
    set({
      isOpen: issues.length > 0,
      result: issues.length > 0
        ? { ...result, repairableFiles: issues.length, issues }
        : null,
    });
  },

  close: () => set({ isOpen: false }),

  clear: () => set({ isOpen: false, result: null }),

  ignoreCurrent: () => {
    const ignoredPaths = new Set(get().ignoredPaths);
    for (const issue of get().result?.issues ?? []) {
      ignoredPaths.add(issue.path);
    }
    set({ isOpen: false, ignoredPaths });
  },

  reset: () => set({
    workspaceId: null,
    isOpen: false,
    result: null,
    ignoredPaths: new Set(),
  }),
}));
