/**
 * 键盘快捷键 Hook
 */

import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';

export function useKeyboardShortcuts() {
  const {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    closeModal,
    openModal,
    isDetailOpen,
    toggleDetail,
    modalType,
  } = useUIStore();
  const { setFilter } = usePromptStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+K: 打开命令面板
      if (cmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Cmd+N: 新建 Prompt
      if (cmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        closeModal();
        openModal('create');
        return;
      }

      // ESC: 关闭面板/模态框
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          closeCommandPalette();
          return;
        }

        if (modalType) {
          closeModal();
          return;
        }

        if (isDetailOpen) {
          toggleDetail(false);
          return;
        }
      }

      // Cmd+1: 全部
      if (cmdOrCtrl && e.key === '1') {
        e.preventDefault();
        setFilter({ favoritesOnly: false, recentOnly: false, tag: undefined });
        return;
      }

      // Cmd+2: 最近
      if (cmdOrCtrl && e.key === '2') {
        e.preventDefault();
        setFilter({ favoritesOnly: false, recentOnly: true, tag: undefined });
        return;
      }

      // Cmd+3: 收藏
      if (cmdOrCtrl && e.key === '3') {
        e.preventDefault();
        setFilter({ favoritesOnly: true, recentOnly: false, tag: undefined });
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    modalType,
    closeModal,
    openModal,
    isDetailOpen,
    toggleDetail,
    setFilter,
  ]);
}
