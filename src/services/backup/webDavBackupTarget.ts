import { invoke } from '@tauri-apps/api/core';
import type { BackupManifest, BackupTarget } from './types';

const MANIFEST_PATH = '.promptclip-backup.json';
const TEMP_MANIFEST_PATH = '.promptclip-backup.json.tmp';

export interface WebDavTargetConfig {
  kind: 'webdav';
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  remotePath: string;
  credentialId: string;
}

type WebDavConnection = Omit<WebDavTargetConfig, 'kind' | 'id' | 'name'>;

function connectionFromConfig(config: WebDavTargetConfig): WebDavConnection {
  return {
    baseUrl: config.baseUrl,
    username: config.username,
    remotePath: config.remotePath,
    credentialId: config.credentialId,
  };
}

function parseManifest(content: Uint8Array): BackupManifest {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(content));
  if (!parsed || typeof parsed !== 'object' || (parsed as BackupManifest).schemaVersion !== 1) {
    throw new Error('MANIFEST_INVALID');
  }
  return parsed as BackupManifest;
}

export async function storeWebDavPassword(
  credentialId: string,
  password: string
): Promise<void> {
  await invoke('webdav_store_password', { credentialId, password });
}

export async function deleteWebDavPassword(credentialId: string): Promise<void> {
  await invoke('webdav_delete_password', { credentialId });
}

export async function testWebDavConnection(config: WebDavTargetConfig): Promise<void> {
  await invoke('webdav_test_connection', { connection: connectionFromConfig(config) });
}

export function createWebDavBackupTarget(config: WebDavTargetConfig): BackupTarget {
  const connection = connectionFromConfig(config);
  return {
    id: config.id,
    kind: 'webdav',
    listRoot: () => invoke<string[]>('webdav_list', { connection }),
    readManifest: async () => {
      const content = await invoke<number[] | null>('webdav_read', {
        connection,
        path: MANIFEST_PATH,
      });
      return content ? parseManifest(new Uint8Array(content)) : null;
    },
    upload: async (path, content) => {
      await invoke('webdav_write', { connection, path, content: Array.from(content) });
    },
    download: async (path) => {
      const content = await invoke<number[] | null>('webdav_read', { connection, path });
      if (!content) throw new Error(`DOWNLOAD_FAILED: ${path}`);
      return new Uint8Array(content);
    },
    delete: async (path) => {
      await invoke('webdav_delete', { connection, path });
    },
    commitManifest: async (manifest) => {
      const content = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
      await invoke('webdav_write', {
        connection,
        path: TEMP_MANIFEST_PATH,
        content: Array.from(content),
      });
      await invoke('webdav_move', {
        connection,
        from: TEMP_MANIFEST_PATH,
        to: MANIFEST_PATH,
      });
    },
  };
}
