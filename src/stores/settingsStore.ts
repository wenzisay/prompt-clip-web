/**
 * 设置状态管理
 */

import { create } from 'zustand';
import type { HistoryVersionSettings } from '@/services/folderConfigService';

export const DEFAULT_HISTORY_SETTINGS: HistoryVersionSettings = {
  enabled: false,
  retentionDays: 30,
};

interface SettingsState {
  /** 历史版本设置 */
  historySettings: HistoryVersionSettings;
  /** 设置历史版本配置 */
  setHistorySettings: (historySettings: HistoryVersionSettings) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  historySettings: DEFAULT_HISTORY_SETTINGS,

  setHistorySettings: (historySettings) => {
    set({ historySettings });
  },

  resetSettings: () => {
    set({ historySettings: DEFAULT_HISTORY_SETTINGS });
  },
}));
