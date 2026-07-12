import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFakeFileRepository,
  createFakeWorkspace,
} from '@/services/fileRepository';
import { createPollingWorkspaceChangeSource } from './pollingWorkspaceChangeSource';

describe('pollingWorkspaceChangeSource', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports external changes without reporting the initial snapshot', async () => {
    vi.useFakeTimers();
    const repository = createFakeFileRepository({ files: { 'existing.md': '# Existing' } });
    const workspace = createFakeWorkspace();
    const onChange = vi.fn();
    const source = createPollingWorkspaceChangeSource(repository, { intervalMs: 2_000 });

    const stop = await source.start(workspace, onChange);
    expect(onChange).not.toHaveBeenCalled();

    await repository.writeText(workspace, 'created.md', '# Created');
    await vi.advanceTimersByTimeAsync(2_000);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: workspace.id,
        source: 'poll',
        changes: [expect.objectContaining({ kind: 'created', path: 'created.md' })],
      })
    );
    stop();
  });

  it('pauses interval scans while hidden and scans when focus returns', async () => {
    vi.useFakeTimers();
    const repository = createFakeFileRepository();
    const workspace = createFakeWorkspace();
    const onChange = vi.fn();
    let visibilityState: DocumentVisibilityState = 'hidden';
    const listeners = new Map<string, EventListener>();
    const documentTarget = {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name),
    } as Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
    const windowListeners = new Map<string, EventListener>();
    const windowTarget = {
      addEventListener: (name: string, listener: EventListener) => windowListeners.set(name, listener),
      removeEventListener: (name: string) => windowListeners.delete(name),
    } as Pick<Window, 'addEventListener' | 'removeEventListener'>;
    const source = createPollingWorkspaceChangeSource(repository, {
      intervalMs: 2_000,
      documentTarget,
      windowTarget,
    });

    const stop = await source.start(workspace, onChange);
    await repository.writeText(workspace, 'created.md', '# Created');
    await vi.advanceTimersByTimeAsync(4_000);
    expect(onChange).not.toHaveBeenCalled();

    visibilityState = 'visible';
    windowListeners.get('focus')?.(new Event('focus'));
    await Promise.resolve();
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'focus-scan' })
    );

    stop();
    await repository.writeText(workspace, 'later.md', '# Later');
    listeners.get('visibilitychange')?.(new Event('visibilitychange'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
