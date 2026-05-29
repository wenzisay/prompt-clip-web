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
        shareAuthorName: '',
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
      shareAuthorName: '',
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
      shareAuthorName: '',
    });
  });

  it('normalizes share author name', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          shareAuthorName: '  周文超  ',
        }),
      },
    });

    await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
      historyVersions: {
        enabled: false,
        retentionDays: 30,
      },
      pinnedTags: [],
      shareAuthorName: '周文超',
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
      shareAuthorName: '',
    });
  });

  it('updates history version settings while keeping pinned tags and share author', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          pinnedTags: ['ai'],
          shareAuthorName: '周文超',
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
      shareAuthorName: '周文超',
    });
  });

  it('updates share author name while keeping other config', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          pinnedTags: ['ai'],
          historyVersions: {
            enabled: true,
            retentionDays: 90,
          },
        }),
      },
    });

    await FolderConfigService.updateShareAuthorName(repository, workspace, '  周文超  ');

    const content = await repository.readText(workspace, '.promptclip.json');
    expect(JSON.parse(content)).toEqual({
      historyVersions: {
        enabled: true,
        retentionDays: 90,
      },
      pinnedTags: ['ai'],
      shareAuthorName: '周文超',
    });
  });
});
