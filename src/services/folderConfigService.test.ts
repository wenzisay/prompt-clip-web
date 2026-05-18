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
      pinnedTags: ['ai', 'work'],
    });
  });

  it('writes pinned tags to config file', async () => {
    const repository = createFakeFileRepository();
    await FolderConfigService.updatePinnedTags(repository, workspace, ['ai', 'work']);
    const content = await repository.readText(workspace, '.promptclip.json');
    expect(JSON.parse(content)).toEqual({ pinnedTags: ['ai', 'work'] });
  });
});
