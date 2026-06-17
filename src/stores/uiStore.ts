/**
 * UI 状态管理
 */

import { create } from 'zustand';
import type { ModalType, Toast } from '@/types/ui';

interface UIState {
  /** 详情面板是否打开 */
  isDetailOpen: boolean;
  /** 当前选中的 Prompt ID */
  selectedPromptId: string | null;
  /** 批量选中的 Prompt IDs */
  selectedPromptIds: string[];

  /** 当前打开的模态框类型 */
  modalType: ModalType;
  /** 待删除的 Prompt ID */
  deletingPromptId: string | null;
  /** 命令面板是否打开 */
  isCommandPaletteOpen: boolean;
  /** 是否正在加载 */
  isLoading: boolean;

  /** Toast 消息列表 */
  toasts: Toast[];

  /** 切换详情面板 */
  toggleDetail: (isOpen?: boolean) => void;
  /** 选中的 Prompt */
  setSelectedPrompt: (promptId: string | null) => void;
  /** 批量选择 */
  toggleSelectPrompt: (promptId: string) => void;
  /** 清除选择 */
  clearSelection: () => void;
  /** 全选/取消全选 */
  toggleSelectAll: (promptIds: string[]) => void;

  /** 打开模态框 */
  openModal: (type: ModalType, promptId?: string) => void;
  /** 关闭模态框 */
  closeModal: () => void;

  /** 打开命令面板 */
  openCommandPalette: () => void;
  /** 关闭命令面板 */
  closeCommandPalette: () => void;

  /** 添加 Toast */
  addToast: (toast: Omit<Toast, 'id'>) => void;
  /** 移除 Toast */
  removeToast: (id: string) => void;

  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isDetailOpen: false,
  selectedPromptId: null,
  selectedPromptIds: [],
  modalType: null,
  deletingPromptId: null,
  isCommandPaletteOpen: false,
  isLoading: false,
  toasts: [],

  toggleDetail: (isOpen) => {
    set((state) => ({
      isDetailOpen: isOpen !== undefined ? isOpen : !state.isDetailOpen,
      selectedPromptId: isOpen === false ? null : state.selectedPromptId,
    }));
  },

  setSelectedPrompt: (promptId) => {
    set({
      selectedPromptId: promptId,
      isDetailOpen: promptId !== null,
    });
  },

  toggleSelectPrompt: (promptId) => {
    set((state) => {
      const isSelected = state.selectedPromptIds.includes(promptId);
      return {
        selectedPromptIds: isSelected
          ? state.selectedPromptIds.filter((id) => id !== promptId)
          : [...state.selectedPromptIds, promptId],
      };
    });
  },

  clearSelection: () => {
    set({ selectedPromptIds: [] });
  },

  toggleSelectAll: (promptIds) => {
    set((state) => {
      const allSelected =
        promptIds.length > 0 &&
        promptIds.every((id) => state.selectedPromptIds.includes(id));

      return {
        selectedPromptIds: allSelected ? [] : [...promptIds],
      };
    });
  },

  openModal: (type, promptId) => {
    set({
      modalType: type,
      deletingPromptId: type === 'delete' && promptId ? promptId : null,
      isDetailOpen: type === 'create' || type === 'edit' ? false : get().isDetailOpen,
    });
  },

  closeModal: () => {
    set({ modalType: null, deletingPromptId: null });
  },

  openCommandPalette: () => {
    set({ isCommandPaletteOpen: true });
  },

  closeCommandPalette: () => {
    set({ isCommandPaletteOpen: false });
  },

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 自动移除
    if (toast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));
