import type { BackupManifest, BackupTarget } from './types';

export function createFakeBackupTarget(): BackupTarget & {
  dumpFiles(): Record<string, Uint8Array>;
  dumpManifest(): BackupManifest | null;
  failNextUpload(path: string): void;
} {
  const files = new Map<string, Uint8Array>();
  let manifest: BackupManifest | null = null;
  let failingPath: string | null = null;

  return {
    id: 'fake-target',
    kind: 'webdav',
    listRoot: async () => Array.from(files.keys()),
    readManifest: async () => manifest ? structuredClone(manifest) : null,
    upload: async (path, content) => {
      if (path === failingPath) {
        failingPath = null;
        throw new Error(`Upload failed: ${path}`);
      }
      files.set(path, new Uint8Array(content));
    },
    download: async (path) => {
      const content = files.get(path);
      if (!content) throw new Error(`Missing remote file: ${path}`);
      return new Uint8Array(content);
    },
    delete: async (path) => {
      files.delete(path);
    },
    commitManifest: async (nextManifest) => {
      manifest = structuredClone(nextManifest);
    },
    dumpFiles: () => Object.fromEntries(files),
    dumpManifest: () => manifest ? structuredClone(manifest) : null,
    failNextUpload: (path) => {
      failingPath = path;
    },
  };
}
