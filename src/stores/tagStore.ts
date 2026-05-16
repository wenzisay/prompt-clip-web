/**
 * 标签状态管理
 */

import { create } from 'zustand';
import type { TagTreeNode, TagColor } from '@/types/tag';
import { TagService } from '@/services/tagService';

interface TagState {
  /** 所有唯一标签 */
  tags: string[];
  /** 标签树 */
  tagTree: TagTreeNode[];
  /** 置顶的标签 */
  pinnedTags: string[];

  /** 设置标签 */
  setTags: (tags: string[]) => void;
  /** 切换标签展开状态 */
  toggleExpand: (tagName: string) => void;
  /** 切换标签置顶 */
  togglePin: (tagName: string) => void;
  /** 标签重命名后同步置顶列表 */
  renamePinnedTag: (oldTagName: string, newTagName: string) => void;
  /** 标签删除后同步置顶列表 */
  removePinnedTag: (tagName: string) => void;
  /** 获取标签颜色 */
  getTagColor: (tagName: string) => TagColor;
  /** 清空标签 */
  clearTags: () => void;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  tagTree: [],
  pinnedTags: [],

  setTags: (tags) => {
    const uniqueTags = Array.from(new Set(tags)).sort();
    // 构建标签树
    const tree = TagService.buildTagTree(tags);
    set({ tags: uniqueTags, tagTree: tree });
  },

  toggleExpand: (tagName) => {
    set((state) => ({
      tagTree: TagService.toggleTagExpansion(state.tagTree, tagName),
    }));
  },

  togglePin: (tagName) => {
    set((state) => {
      const newPinned = state.pinnedTags.includes(tagName)
        ? state.pinnedTags.filter((t) => t !== tagName)
        : [...state.pinnedTags, tagName];

      // 更新标签树中的置顶状态
      const newTree = TagService.toggleTagPin(state.tagTree, tagName);

      return {
        pinnedTags: newPinned,
        tagTree: newTree,
      };
    });
  },

  renamePinnedTag: (oldTagName, newTagName) => {
    set((state) => ({
      pinnedTags: state.pinnedTags.map((tag) =>
        tag === oldTagName ? newTagName : tag
      ),
    }));
  },

  removePinnedTag: (tagName) => {
    set((state) => ({
      pinnedTags: state.pinnedTags.filter((tag) => tag !== tagName),
    }));
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
