/**
 * 标签状态管理
 */

import { create } from 'zustand';
import type { WorkspaceRef } from '@/types/file';
import type { TagTreeNode, TagColor } from '@/types/tag';
import { TagService } from '@/services/tagService';
import { FolderConfigService } from '@/services/folderConfigService';
import { fileRepository } from '@/services/fileRepository';
import { getStorageItem, StorageKeys } from '@/utils/storage';

const savedPinnedTags = getStorageItem<string[]>(StorageKeys.PINNED_TAGS) || [];

async function savePinnedTags(
  workspace: WorkspaceRef | null | undefined,
  pinnedTags: string[]
) {
  if (!workspace) return;

  try {
    await FolderConfigService.updatePinnedTags(fileRepository, workspace, pinnedTags);
  } catch (error) {
    console.warn('Failed to persist pinned tags:', error);
  }
}

interface TagState {
  /** 所有唯一标签 */
  tags: string[];
  /** 标签树 */
  tagTree: TagTreeNode[];
  /** 置顶的标签 */
  pinnedTags: string[];

  /** 设置标签 */
  setTags: (tags: string[]) => void;
  /** 设置置顶标签 */
  setPinnedTags: (pinnedTags: string[]) => void;
  /** 从文件夹配置加载置顶标签 */
  loadPinnedTags: (workspace: WorkspaceRef) => Promise<void>;
  /** 切换标签展开状态 */
  toggleExpand: (tagName: string) => void;
  /** 切换标签置顶 */
  togglePin: (tagName: string, workspace?: WorkspaceRef | null) => Promise<void>;
  /** 标签重命名后同步置顶列表 */
  renamePinnedTag: (
    oldTagName: string,
    newTagName: string,
    workspace?: WorkspaceRef | null
  ) => Promise<void>;
  /** 标签删除后同步置顶列表 */
  removePinnedTag: (
    tagName: string,
    workspace?: WorkspaceRef | null
  ) => Promise<void>;
  /** 获取标签颜色 */
  getTagColor: (tagName: string) => TagColor;
  /** 清空标签 */
  clearTags: () => void;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  tagTree: [],
  pinnedTags: savedPinnedTags,

  setTags: (tags) => {
    const uniqueTags = Array.from(new Set(tags)).sort();
    // 构建标签树
    const tree = TagService.buildTagTree(tags);
    set({ tags: uniqueTags, tagTree: tree });
  },

  setPinnedTags: (pinnedTags) => {
    set({ pinnedTags: Array.from(new Set(pinnedTags)) });
  },

  loadPinnedTags: async (workspace) => {
    const hasFolderConfig = await FolderConfigService.folderConfigExists(fileRepository, workspace);
    const config = await FolderConfigService.readFolderConfig(fileRepository, workspace);
    const shouldMigrateLegacyPins = !hasFolderConfig && savedPinnedTags.length > 0;
    const nextPinnedTags = shouldMigrateLegacyPins ? savedPinnedTags : config.pinnedTags;

    set({ pinnedTags: nextPinnedTags });

    if (shouldMigrateLegacyPins) {
      await savePinnedTags(workspace, savedPinnedTags);
    }
  },

  toggleExpand: (tagName) => {
    set((state) => ({
      tagTree: TagService.toggleTagExpansion(state.tagTree, tagName),
    }));
  },

  togglePin: async (tagName, workspace) => {
    let pinnedTags: string[] = [];

    set((state) => {
      const newPinned = state.pinnedTags.includes(tagName)
        ? state.pinnedTags.filter((t) => t !== tagName)
        : [...state.pinnedTags, tagName];

      // 更新标签树中的置顶状态
      const newTree = TagService.toggleTagPin(state.tagTree, tagName);
      pinnedTags = newPinned;

      return {
        pinnedTags: newPinned,
        tagTree: newTree,
      };
    });

    await savePinnedTags(workspace, pinnedTags);
  },

  renamePinnedTag: async (oldTagName, newTagName, workspace) => {
    let pinnedTags: string[] = [];

    set((state) => {
      const newPinned = state.pinnedTags.map((tag) =>
        tag === oldTagName ? newTagName : tag
      );
      pinnedTags = newPinned;

      return { pinnedTags: newPinned };
    });

    await savePinnedTags(workspace, pinnedTags);
  },

  removePinnedTag: async (tagName, workspace) => {
    let pinnedTags: string[] = [];

    set((state) => {
      const newPinned = state.pinnedTags.filter((tag) => tag !== tagName);
      pinnedTags = newPinned;

      return { pinnedTags: newPinned };
    });

    await savePinnedTags(workspace, pinnedTags);
  },

  getTagColor: (tagName) => {
    return TagService.getTagColor(tagName);
  },

  clearTags: () => {
    set({
      tags: [],
      tagTree: [],
      pinnedTags: [],
    });
  },
}));
