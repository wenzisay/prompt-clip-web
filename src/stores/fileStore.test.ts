import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRef } from '@/types/file';
import { useFileStore } from './fileStore';

const workspace: WorkspaceRef = {
  id: 'web:Prompts',
  name: 'Prompts',
  platform: 'web',
  handleKey: 'directory',
};

const repository = vi.hoisted(() => ({
  isSupported: vi.fn(),
  restoreDirectory: vi.fn(),
  verifyPermission: vi.fn(),
  clearSavedWorkspace: vi.fn(),
}));

vi.mock('@/services/fileRepository', () => ({
  fileRepository: repository,
}));

describe('fileStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileStore.setState({
      isSupported: false,
      isAuthorized: false,
      hasInitialized: false,
      workspace: null,
      pendingWorkspace: null,
      workspaceName: null,
      lastAccessTime: null,
      isLoading: false,
      error: null,
    });
  });

  it('marks initialization complete after restoring a saved workspace', async () => {
    repository.isSupported.mockReturnValue(true);
    repository.restoreDirectory.mockResolvedValue(workspace);
    repository.verifyPermission.mockResolvedValue(true);

    await useFileStore.getState().initialize();

    expect(useFileStore.getState()).toMatchObject({
      hasInitialized: true,
      isSupported: true,
      isAuthorized: true,
      workspace,
      pendingWorkspace: null,
      workspaceName: 'Prompts',
      error: null,
    });
  });

  it('keeps a saved workspace pending when permission requires a user gesture', async () => {
    repository.isSupported.mockReturnValue(true);
    repository.restoreDirectory.mockResolvedValue(workspace);
    repository.verifyPermission.mockResolvedValue(false);

    await useFileStore.getState().initialize();

    expect(useFileStore.getState()).toMatchObject({
      hasInitialized: true,
      isSupported: true,
      isAuthorized: false,
      workspace: null,
      pendingWorkspace: workspace,
      workspaceName: 'Prompts',
      error: null,
    });
  });

  it('keeps initialization incomplete while restore is still pending', async () => {
    repository.isSupported.mockReturnValue(true);
    repository.restoreDirectory.mockImplementation(() => new Promise(() => undefined));

    void useFileStore.getState().initialize();

    expect(useFileStore.getState().hasInitialized).toBe(false);
  });
});
