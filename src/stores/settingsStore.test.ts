import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HISTORY_SETTINGS,
  detectInitialLocale,
  useSettingsStore,
} from './settingsStore';

describe('settingsStore', () => {
  it('detects Simplified Chinese from browser languages', () => {
    expect(detectInitialLocale(['zh-CN'])).toBe('zh-CN');
    expect(detectInitialLocale(['en-US', 'zh-Hans-CN'])).toBe('zh-CN');
    expect(detectInitialLocale(['zh-SG'])).toBe('zh-CN');
  });

  it('detects Traditional Chinese from browser languages', () => {
    expect(detectInitialLocale(['zh-TW'])).toBe('zh-TW');
    expect(detectInitialLocale(['zh-HK'])).toBe('zh-TW');
    expect(detectInitialLocale(['zh-MO'])).toBe('zh-TW');
    expect(detectInitialLocale(['zh-Hant'])).toBe('zh-TW');
    expect(detectInitialLocale(['en-US', 'zh-Hant-TW'])).toBe('zh-TW');
  });

  it('uses English for unsupported or non-Chinese languages', () => {
    expect(detectInitialLocale(undefined)).toBe('en-US');
    expect(detectInitialLocale(['en-US'])).toBe('en-US');
  });

  it('updates the locale without resetting history settings', () => {
    useSettingsStore.getState().setHistorySettings({
      enabled: true,
      retentionDays: 90,
    });

    useSettingsStore.getState().setLocale('en-US');

    expect(useSettingsStore.getState().locale).toBe('en-US');
    expect(useSettingsStore.getState().historySettings).toEqual({
      enabled: true,
      retentionDays: 90,
    });

    useSettingsStore.getState().setLocale('zh-CN');
    useSettingsStore.getState().setHistorySettings(DEFAULT_HISTORY_SETTINGS);
  });
});
