import { describe, expect, it, vi } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { FolderConfigService } from './folderConfigService';

const workspace = createFakeWorkspace();

describe('FolderConfigService', () => {
  it('returns defaults when config does not exist', async () => {
    const repository = createFakeFileRepository();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
        historyVersions: {
          enabled: false,
          retentionDays: 30,
        },
        pinnedTags: [],
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('normalizes invalid pinned tags', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          pinnedTags: ['ai', 'ai', 1, 'work'],
        }),
      },
    });

    await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
      historyVersions: {
        enabled: false,
        retentionDays: 30,
      },
      pinnedTags: ['ai', 'work'],
    });
  });

  it('normalizes history version settings', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          historyVersions: {
            enabled: true,
            retentionDays: 365,
          },
        }),
      },
    });

    await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
      historyVersions: {
        enabled: true,
        retentionDays: 365,
      },
      pinnedTags: [],
    });
  });

  it('writes pinned tags to config file', async () => {
    const repository = createFakeFileRepository();
    await FolderConfigService.updatePinnedTags(repository, workspace, ['ai', 'work']);
    const content = await repository.readText(workspace, '.promptclip.json');
    expect(JSON.parse(content)).toEqual({
      historyVersions: {
        enabled: false,
        retentionDays: 30,
      },
      pinnedTags: ['ai', 'work'],
    });
  });

  it('updates history version settings while keeping pinned tags', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          pinnedTags: ['ai'],
        }),
      },
    });

    await FolderConfigService.updateHistoryVersionSettings(repository, workspace, {
      enabled: true,
      retentionDays: 90,
    });

    const content = await repository.readText(workspace, '.promptclip.json');
    expect(JSON.parse(content)).toEqual({
      historyVersions: {
        enabled: true,
        retentionDays: 90,
      },
      pinnedTags: ['ai'],
    });
  });
});
