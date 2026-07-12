import { describe, expect, it, vi } from 'vitest';
import {
  createFakeFileRepository,
  createFakeWorkspace,
} from '@/services/fileRepository';
import { createTauriWorkspaceChangeSource } from './tauriWorkspaceChangeSource';

describe('tauriWorkspaceChangeSource', () => {
  it('confirms native events through snapshots and cancels the watcher', async () => {
    const repository = createFakeFileRepository();
    const workspace = { ...createFakeWorkspace(), platform: 'desktop' as const, path: '/notes' };
    const unwatch = vi.fn();
    let notifyNativeChange: (() => void) | undefined;
    const watch = vi.fn(async (_path, callback) => {
      notifyNativeChange = callback;
      return unwatch;
    });
    const onChange = vi.fn();
    const source = createTauriWorkspaceChangeSource(repository, watch);

    const stop = await source.start(workspace, onChange);
    await repository.writeText(workspace, 'created.md', '# Created');
    notifyNativeChange?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(watch).toHaveBeenCalledWith(
      '/notes',
      expect.any(Function),
      { delayMs: 500, recursive: true }
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'native-watch',
        changes: [expect.objectContaining({ kind: 'created', path: 'created.md' })],
      })
    );

    stop();
    expect(unwatch).toHaveBeenCalledOnce();
  });

  it('rejects desktop workspaces without a native path', async () => {
    const repository = createFakeFileRepository();
    const source = createTauriWorkspaceChangeSource(repository, vi.fn());

    await expect(source.start(createFakeWorkspace(), vi.fn())).rejects.toThrow(
      '工作区路径不可用'
    );
  });
});
