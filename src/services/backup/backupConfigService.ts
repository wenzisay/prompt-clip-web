import { Store } from '@tauri-apps/plugin-store';
import type { WebDavTargetConfig } from './webDavBackupTarget';

const STORE_FILE = 'promptclip-backup.json';
const TARGET_KEY = 'target';

export async function loadBackupTargetConfig(): Promise<WebDavTargetConfig | null> {
  const store = await Store.load(STORE_FILE);
  return (await store.get<WebDavTargetConfig>(TARGET_KEY)) ?? null;
}

export async function saveBackupTargetConfig(config: WebDavTargetConfig): Promise<void> {
  const store = await Store.load(STORE_FILE);
  await store.set(TARGET_KEY, config);
  await store.save();
}

export async function clearBackupTargetConfig(): Promise<void> {
  const store = await Store.load(STORE_FILE);
  await store.delete(TARGET_KEY);
  await store.save();
}

export const BackupConfigService = {
  clearBackupTargetConfig,
  loadBackupTargetConfig,
  saveBackupTargetConfig,
} as const;
