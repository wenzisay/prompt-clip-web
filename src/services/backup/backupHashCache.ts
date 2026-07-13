import { Store } from '@tauri-apps/plugin-store';
import type { BackupHashCache, BackupHashCacheEntry } from './types';

const STORE_FILE = 'promptclip-backup-hashes.json';

export function createTauriBackupHashCache(
  targetId: string,
  workspaceId: string
): BackupHashCache {
  const key = `${targetId}:${workspaceId}`;
  return {
    load: async () => {
      const store = await Store.load(STORE_FILE);
      return (await store.get<BackupHashCacheEntry[]>(key)) ?? [];
    },
    save: async (entries) => {
      const store = await Store.load(STORE_FILE);
      await store.set(key, entries);
      await store.save();
    },
  };
}
