import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptService } from '@/services/promptService';
import { WorkspaceIntegrityService } from '@/services/workspaceIntegrityService';
import { MetadataRepairService } from '@/services/metadataRepairService';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { WorkspaceChangeBatch } from '@/services/workspaceChanges';
import { useWorkspaceFileWatcher } from './useWorkspaceFileWatcher';

const sourceMocks = vi.hoisted(() => ({
  start: vi.fn(),
}));

vi.mock('@/services/workspaceChanges', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/workspaceChanges')>();
  return {
    ...actual,
    createWorkspaceChangeSource: () => sourceMocks,
  };
});

function WatcherHarness() {
  useWorkspaceFileWatcher();
  return null;
}

describe('useWorkspaceFileWatcher', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    sourceMocks.start.mockReset();
    useSettingsStore.getState().setFileWatchingEnabled(false);
    useFileStore.setState({ workspace: null, isAuthorized: false });
  });

  it('starts only when enabled and stops when disabled', async () => {
    const stop = vi.fn();
    sourceMocks.start.mockResolvedValue(stop);
    useFileStore.setState({
      workspace: { id: 'web:notes', name: 'notes', platform: 'web' },
      isAuthorized: true,
    });

    render(<WatcherHarness />);
    expect(sourceMocks.start).not.toHaveBeenCalled();

    act(() => useSettingsStore.getState().setFileWatchingEnabled(true));
    await waitFor(() => expect(sourceMocks.start).toHaveBeenCalledOnce());

    act(() => useSettingsStore.getState().setFileWatchingEnabled(false));
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
  });

  it('reloads prompts after a workspace change batch', async () => {
    let notifyChange: ((batch: WorkspaceChangeBatch) => void) | undefined;
    sourceMocks.start.mockImplementation(async (_workspace, onChange) => {
      notifyChange = onChange;
      return vi.fn();
    });
    vi.spyOn(PromptService, 'loadPrompts').mockResolvedValue([]);
    const repairIds = vi
      .spyOn(WorkspaceIntegrityService, 'repairPromptIds')
      .mockResolvedValue({ repairs: [], failures: [] });
    vi.spyOn(MetadataRepairService, 'scanPromptMetadata').mockResolvedValue({
      totalMarkdownFiles: 0,
      healthyFiles: 0,
      repairableFiles: 0,
      issues: [],
    });
    useFileStore.setState({
      workspace: { id: 'web:notes', name: 'notes', platform: 'web' },
      isAuthorized: true,
    });
    useSettingsStore.getState().setFileWatchingEnabled(true);

    render(<WatcherHarness />);
    await waitFor(() => expect(notifyChange).toBeDefined());
    act(() => {
      notifyChange?.({
        workspaceId: 'web:notes',
        source: 'poll',
        changes: [{ kind: 'created', path: 'new.md', detectedAt: new Date() }],
      });
    });

    await waitFor(() => expect(PromptService.loadPrompts).toHaveBeenCalledOnce());
    expect(repairIds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'web:notes' }),
      { newlyCreatedPaths: new Set(['new.md']) }
    );
  });
});
