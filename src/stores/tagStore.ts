/**
 * 标签状态管理
 */

import { create } from 'zustand';
import type { TagTreeNode, TagColor } from '@/types/tag';
import { TagService } from '@/services/tagService';
import { FolderConfigService } from '@/services/folderConfigService';
import { getStorageItem, StorageKeys } from '@/utils/storage';

const savedPinnedTags = getStorageItem<string[]>(StorageKeys.PINNED_TAGS) || [];

async function savePinnedTags(
  directoryHandle: FileSystemDirectoryHandle | null | undefined,
  pinnedTags: string[]
) {
  if (!directoryHandle) return;

  try {
    await FolderConfigService.updatePinnedTags(directoryHandle, pinnedTags);
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
  loadPinnedTags: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  /** 切换标签展开状态 */
  toggleExpand: (tagName: string) => void;
  /** 切换标签置顶 */
  togglePin: (tagName: string, directoryHandle?: FileSystemDirectoryHandle | null) => Promise<void>;
  /** 标签重命名后同步置顶列表 */
  renamePinnedTag: (
    oldTagName: string,
    newTagName: string,
    directoryHandle?: FileSystemDirectoryHandle | null
  ) => Promise<void>;
  /** 标签删除后同步置顶列表 */
  removePinnedTag: (
    tagName: string,
    directoryHandle?: FileSystemDirectoryHandle | null
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

  loadPinnedTags: async (directoryHandle) => {
    const hasFolderConfig = await FolderConfigService.folderConfigExists(directoryHandle);
    const config = await FolderConfigService.readFolderConfig(directoryHandle);
    const shouldMigrateLegacyPins = !hasFolderConfig && savedPinnedTags.length > 0;
    const nextPinnedTags = shouldMigrateLegacyPins ? savedPinnedTags : config.pinnedTags;

    set({ pinnedTags: nextPinnedTags });

    if (shouldMigrateLegacyPins) {
      await savePinnedTags(directoryHandle, savedPinnedTags);
    }
  },

  toggleExpand: (tagName) => {
    set((state) => ({
      tagTree: TagService.toggleTagExpansion(state.tagTree, tagName),
    }));
  },

  togglePin: async (tagName, directoryHandle) => {
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

    await savePinnedTags(directoryHandle, pinnedTags);
  },

  renamePinnedTag: async (oldTagName, newTagName, directoryHandle) => {
    let pinnedTags: string[] = [];

    set((state) => {
      const newPinned = state.pinnedTags.map((tag) =>
        tag === oldTagName ? newTagName : tag
      );
      pinnedTags = newPinned;

      return { pinnedTags: newPinned };
    });

    await savePinnedTags(directoryHandle, pinnedTags);
  },

  removePinnedTag: async (tagName, directoryHandle) => {
    let pinnedTags: string[] = [];

    set((state) => {
      const newPinned = state.pinnedTags.filter((tag) => tag !== tagName);
      pinnedTags = newPinned;

      return { pinnedTags: newPinned };
    });

    await savePinnedTags(directoryHandle, pinnedTags);
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
