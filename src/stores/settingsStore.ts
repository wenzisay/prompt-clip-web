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

export const DEFAULT_SHARE_AUTHOR_NAME = '';

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

  const hasTraditionalChinese = normalizedLanguages.some(
    (language) =>
      language === 'zh-tw' ||
      language === 'zh-hant' ||
      language.startsWith('zh-hant-') ||
      language === 'zh-hk' ||
      language === 'zh-mo'
  );

  const hasSimplifiedChinese = normalizedLanguages.some(
    (language) =>
      language === 'zh-cn' ||
      language === 'zh-hans' ||
      language.startsWith('zh-hans-') ||
      language === 'zh-sg'
  );

  if (hasTraditionalChinese) {
    return 'zh-TW';
  }
  if (hasSimplifiedChinese) {
    return 'zh-CN';
  }
  return DEFAULT_LOCALE;
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
  /** 分享图片作者名称 */
  shareAuthorName: string;
  /** 设置界面语言 */
  setLocale: (locale: Locale) => void;
  /** 设置历史版本配置 */
  setHistorySettings: (historySettings: HistoryVersionSettings) => void;
  /** 设置分享图片作者名称 */
  setShareAuthorName: (shareAuthorName: string) => void;
  /** 重置为默认设置 */
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: detectInitialLocale(getBrowserLanguages()),
      historySettings: DEFAULT_HISTORY_SETTINGS,
      shareAuthorName: DEFAULT_SHARE_AUTHOR_NAME,

      setLocale: (locale) => {
        set({ locale });
      },

      setHistorySettings: (historySettings) => {
        set({ historySettings });
      },

      setShareAuthorName: (shareAuthorName) => {
        set({ shareAuthorName });
      },

      resetSettings: () => {
        set({
          historySettings: DEFAULT_HISTORY_SETTINGS,
          shareAuthorName: DEFAULT_SHARE_AUTHOR_NAME,
        });
      },
    }),
    {
      name: 'promptclip-settings',
      storage: createJSONStorage(getSettingsStorage),
      partialize: (state) => ({
        locale: state.locale,
      }),
    }
  )
);
