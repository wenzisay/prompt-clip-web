import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

import { createWebDavBackupTarget, type WebDavTargetConfig } from './webDavBackupTarget';

const config: WebDavTargetConfig = {
  kind: 'webdav',
  id: 'target-1',
  name: 'My WebDAV',
  baseUrl: 'https://dav.example.com/',
  username: 'user',
  remotePath: 'promptclip',
  credentialId: 'credential-1',
};

describe('webDavBackupTarget', () => {
  beforeEach(() => invoke.mockReset());

  it('commits the manifest through a temporary file and move', async () => {
    invoke.mockResolvedValue(undefined);
    const target = createWebDavBackupTarget(config);
    const manifest = {
      schemaVersion: 1 as const,
      backupId: 'backup',
      sourceWorkspaceId: 'workspace',
      appVersion: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      files: {},
    };

    await target.commitManifest(manifest);

    expect(invoke).toHaveBeenNthCalledWith(1, 'webdav_write', expect.objectContaining({
      path: '.promptclip-backup.json.tmp',
    }));
    expect(invoke).toHaveBeenNthCalledWith(2, 'webdav_move', expect.objectContaining({
      from: '.promptclip-backup.json.tmp',
      to: '.promptclip-backup.json',
    }));
  });

  it('returns null when no manifest exists', async () => {
    invoke.mockResolvedValue(null);
    await expect(createWebDavBackupTarget(config).readManifest()).resolves.toBeNull();
  });
});
