import { describe, expect, it, vi } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from '@/services/fileRepository';
import { backupWorkspace, restoreWorkspace } from './backupService';
import { createFakeBackupTarget } from './fakeBackupTarget';

describe('backupService', () => {
  it('uploads only changed files and removes files deleted locally', async () => {
    const workspace = createFakeWorkspace();
    const repository = createFakeFileRepository({
      files: { 'one.md': 'one', '_promptclip/promptclip.config.json': '{}' },
      binaryFiles: { '_promptclip/assets/image.png': new Uint8Array([1, 2, 3]) },
    });
    const target = createFakeBackupTarget();

    const first = await backupWorkspace(repository, workspace, target);
    expect(first).toMatchObject({ uploaded: 3, deleted: 0, unchanged: 0 });

    await repository.writeText(workspace, 'two.md', 'two');
    await repository.remove(workspace, 'one.md');
    const second = await backupWorkspace(repository, workspace, target);

    expect(second).toMatchObject({ uploaded: 1, deleted: 1, unchanged: 2 });
    expect(target.dumpFiles()['one.md']).toBeUndefined();
    expect(new TextDecoder().decode(target.dumpFiles()['two.md'])).toBe('two');
  });

  it('does not replace the manifest when an upload fails', async () => {
    const workspace = createFakeWorkspace();
    const repository = createFakeFileRepository({ files: { 'one.md': 'one' } });
    const target = createFakeBackupTarget();
    await backupWorkspace(repository, workspace, target);
    const previousManifest = target.dumpManifest();

    await repository.writeText(workspace, 'two.md', 'two');
    target.failNextUpload('two.md');

    await expect(backupWorkspace(repository, workspace, target)).rejects.toThrow();
    expect(target.dumpManifest()).toEqual(previousManifest);
  });

  it('reuses persisted hashes when file size and modified time are unchanged', async () => {
    const workspace = createFakeWorkspace();
    const baseRepository = createFakeFileRepository({ files: { 'one.md': 'one' } });
    const readText = vi.fn(baseRepository.readText);
    const repository = { ...baseRepository, readText };
    const target = createFakeBackupTarget();
    let cachedEntries: import('./types').BackupHashCacheEntry[] = [];
    const cache = {
      load: async () => cachedEntries,
      save: async (entries: import('./types').BackupHashCacheEntry[]) => {
        cachedEntries = entries;
      },
    };

    await backupWorkspace(repository, workspace, target, new Date(), cache);
    readText.mockClear();
    await backupWorkspace(repository, workspace, target, new Date(), cache);

    expect(readText).not.toHaveBeenCalled();
  });

  it('restores every manifest file into an empty workspace', async () => {
    const source = createFakeFileRepository({
      files: { 'one.md': 'one' },
      binaryFiles: { '_promptclip/assets/image.png': new Uint8Array([4, 5]) },
    });
    const target = createFakeBackupTarget();
    await backupWorkspace(source, createFakeWorkspace(), target);
    const destination = createFakeFileRepository();

    await restoreWorkspace(destination, createFakeWorkspace(), target);

    expect(destination.dumpFiles()['one.md']).toBe('one');
    expect(destination.dumpBinaryFiles()['_promptclip/assets/image.png']).toEqual([4, 5]);
  });

  it('allows restoring the same backup into its previously restored workspace', async () => {
    const source = createFakeFileRepository({ files: { 'one.md': 'original' } });
    const target = createFakeBackupTarget();
    await backupWorkspace(source, createFakeWorkspace(), target);
    const destination = createFakeFileRepository();
    const workspace = createFakeWorkspace();
    await restoreWorkspace(destination, workspace, target);
    await destination.writeText(workspace, 'one.md', 'locally changed');

    await expect(restoreWorkspace(destination, workspace, target)).resolves.toMatchObject({
      restored: 1,
    });
    expect(destination.dumpFiles()['one.md']).toBe('original');
  });

  it('skips downloading and writing files whose local hash matches the backup', async () => {
    const source = createFakeFileRepository({ files: { 'one.md': 'unchanged' } });
    const target = createFakeBackupTarget();
    await backupWorkspace(source, createFakeWorkspace(), target);
    const destination = createFakeFileRepository({ files: { 'one.md': 'unchanged' } });
    const workspace = createFakeWorkspace();
    const download = vi.fn(target.download);

    const result = await restoreWorkspace(destination, workspace, { ...target, download });

    expect(result).toMatchObject({ restored: 0, unchanged: 1 });
    expect(download).not.toHaveBeenCalled();
  });

  it('preserves an existing config file when restore explicitly skips it', async () => {
    const configPath = '_promptclip/promptclip.config.json';
    const source = createFakeFileRepository({ files: { [configPath]: 'remote config' } });
    const target = createFakeBackupTarget();
    await backupWorkspace(source, createFakeWorkspace(), target);
    const destination = createFakeFileRepository({ files: { [configPath]: 'local config' } });
    const workspace = createFakeWorkspace();

    const result = await restoreWorkspace(destination, workspace, target, new Date(), {
      skipPaths: new Set([configPath]),
    });

    expect(destination.dumpFiles()[configPath]).toBe('local config');
    expect(result).toMatchObject({ restored: 0, skipped: 1 });
  });

  it('refuses to restore into a non-empty workspace', async () => {
    const source = createFakeFileRepository({ files: { 'one.md': 'one' } });
    const target = createFakeBackupTarget();
    await backupWorkspace(source, createFakeWorkspace(), target);
    const destination = createFakeFileRepository({ files: { 'existing.md': 'existing' } });

    await expect(
      restoreWorkspace(destination, createFakeWorkspace(), target)
    ).rejects.toThrow('RESTORE_TARGET_NOT_EMPTY');
  });
});
