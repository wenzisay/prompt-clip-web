/**
 * 主窗口启动时把用户配置的快速搜索快捷键注册为全局快捷键。
 *
 * Rust setup 已注册默认快捷键；本 hook 在前端就绪后读取 settingsStore 中的
 * 开关与用户自定义快捷键，使设置即时生效（前端 settingsStore 为真相源）。
 * 仅主窗口调用。
 */
import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/stores/settingsStore';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useQuickSearchShortcutRegister(): void {
  useEffect(() => {
    if (!isTauri()) return;
    const { quickSearchEnabled, quickSearchShortcut: shortcut } = useSettingsStore.getState();
    if (!quickSearchEnabled) {
      void invoke('unset_quick_search_shortcut').catch((error) => {
        console.warn('Failed to unregister quick search shortcut:', error);
      });
      return;
    }
    void invoke('set_quick_search_shortcut', { shortcut }).catch((error) => {
      console.warn('Failed to register quick search shortcut:', error);
    });
  }, []);
}
