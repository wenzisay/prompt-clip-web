/**
 * 本地存储工具函数
 */

const STORAGE_PREFIX = 'promptclip_';

/**
 * 获取存储项
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const item = localStorage.getItem(fullKey);
    if (item === null) return null;
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
}

/**
 * 设置存储项
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * 移除存储项
 */
export function removeStorageItem(key: string): void {
  const fullKey = STORAGE_PREFIX + key;
  localStorage.removeItem(fullKey);
}

/**
 * 清空所有应用存储
 */
export function clearStorage(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * 存储键枚举
 */
export const StorageKeys = {
  DIRECTORY_HANDLE: 'directory_handle',
  UI_STATE: 'ui_state',
  SETTINGS: 'settings',
  RECENT_PROMPTS: 'recent_prompts',
  PINNED_TAGS: 'pinned_tags',
} as const;
