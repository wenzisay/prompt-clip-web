/**
 * 设置状态管理
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { DEFAULT_LOCALE } from '@/i18n/messages';
import type { Locale } from '@/i18n/types';
import type { HistoryVersionSettings } from '@/services/folderConfigService';

export const DEFAULT_HISTORY_SETTINGS: HistoryVersionSettings = {
  enabled: false,
  retentionDays: 30,
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function getSettingsStorage(): StateStorage {
  if (typeof localStorage === 'undefined') {
    return noopStorage;
  }

  return localStorage;
}

export function detectInitialLocale(languages: readonly string[] | undefined): Locale {
  const normalizedLanguages = languages
    ?.map((language) => language.toLowerCase())
    .filter(Boolean) ?? [];

  const hasSimplifiedChinese = normalizedLanguages.some(
    (language) =>
      language === 'zh-cn' ||
      language === 'zh-hans' ||
      language.startsWith('zh-hans-') ||
      language === 'zh-sg'
  );

  return hasSimplifiedChinese ? 'zh-CN' : DEFAULT_LOCALE;
}

function getBrowserLanguages(): readonly string[] | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }

  if (navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : undefined;
}

interface SettingsState {
  /** 界面语言 */
  locale: Locale;
  /** 历史版本设置 */
  historySettings: HistoryVersionSettings;
  /** 设置界面语言 */
  setLocale: (locale: Locale) => void;
  /** 设置历史版本配置 */
  setHistorySettings: (historySettings: HistoryVersionSettings) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: detectInitialLocale(getBrowserLanguages()),
      historySettings: DEFAULT_HISTORY_SETTINGS,

      setLocale: (locale) => {
        set({ locale });
      },

      setHistorySettings: (historySettings) => {
        set({ historySettings });
      },

      resetSettings: () => {
        set({ historySettings: DEFAULT_HISTORY_SETTINGS });
      },
    }),
    {
      name: 'promptclip-settings',
      storage: createJSONStorage(getSettingsStorage),
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
