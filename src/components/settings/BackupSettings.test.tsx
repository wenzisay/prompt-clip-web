import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeWorkspace, fileRepository } from '@/services/fileRepository';
import { useFileStore } from '@/stores/fileStore';

const mocks = vi.hoisted(() => ({
  backupWorkspace: vi.fn(),
  confirm: vi.fn(),
  loadBackupTargetConfig: vi.fn(),
  saveBackupTargetConfig: vi.fn(),
  storeWebDavPassword: vi.fn(),
  testWebDavConnection: vi.fn(),
  restoreWorkspace: vi.fn(),
  saveTauriWorkspace: vi.fn(),
  selectTauriDirectoryForRestore: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  confirm: mocks.confirm,
  open: vi.fn(),
}));

vi.mock('@/services/backup', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/backup')>(),
  backupWorkspace: mocks.backupWorkspace,
  restoreWorkspace: mocks.restoreWorkspace,
  createTauriBackupHashCache: vi.fn(() => ({ load: vi.fn(), save: vi.fn() })),
  createWebDavBackupTarget: vi.fn(() => ({ id: 'target', kind: 'webdav' })),
  BackupConfigService: {
    loadBackupTargetConfig: mocks.loadBackupTargetConfig,
    saveBackupTargetConfig: mocks.saveBackupTargetConfig,
  },
  storeWebDavPassword: mocks.storeWebDavPassword,
  testWebDavConnection: mocks.testWebDavConnection,
}));

vi.mock('@/services/fileRepository/tauriFileRepository', () => ({
  isTauriRuntime: () => true,
  saveTauriWorkspace: mocks.saveTauriWorkspace,
  selectTauriDirectoryForRestore: mocks.selectTauriDirectoryForRestore,
}));

vi.mock('@/services/promptService', () => ({
  PromptService: { loadPrompts: vi.fn().mockResolvedValue([]) },
}));

import { BackupSettings } from './BackupSettings';

describe('BackupSettings', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadBackupTargetConfig.mockResolvedValue(null);
    mocks.restoreWorkspace.mockResolvedValue({ restored: 1, unchanged: 0, skipped: 0 });
    mocks.selectTauriDirectoryForRestore.mockResolvedValue(createFakeWorkspace());
    vi.spyOn(fileRepository, 'exists').mockResolvedValue(false);
    useFileStore.setState({ workspace: createFakeWorkspace() });
  });

  it('shows WebDAV as a fixed target name instead of an editable field', () => {
    render(<BackupSettings locale="zh-CN" />);

    expect(screen.getByText('WebDAV')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: '目标名称' })).toBeNull();
  });

  it('shows a clear in-progress state while backing up', async () => {
    mocks.backupWorkspace.mockReturnValue(new Promise(() => undefined));
    render(<BackupSettings locale="zh-CN" />);

    fireEvent.click(screen.getByRole('button', { name: '立即备份' }));

    expect((await screen.findByRole('status')).textContent).toContain('正在备份');
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('explains how to fix a missing WebDAV remote directory', async () => {
    mocks.testWebDavConnection.mockRejectedValue('WEBDAV_REMOTE_DIRECTORY_NOT_FOUND');
    render(<BackupSettings locale="zh-CN" />);

    fireEvent.click(screen.getByRole('button', { name: '测试连接' }));

    expect(await screen.findByText('请确保路径正确且远端专用目录已创建。')).toBeTruthy();
  });

  it('preserves the local config when the user chooses skip during restore', async () => {
    vi.mocked(fileRepository.exists).mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(false);
    render(<BackupSettings locale="zh-CN" />);

    fireEvent.click(screen.getByRole('button', { name: '整库恢复' }));

    await waitFor(() => expect(mocks.restoreWorkspace).toHaveBeenCalled());
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.stringContaining('promptclip.config.json'),
      expect.objectContaining({ okLabel: '覆盖', cancelLabel: '跳过' })
    );
    const options = mocks.restoreWorkspace.mock.calls[0][4] as { skipPaths: Set<string> };
    expect(options.skipPaths.has('_promptclip/promptclip.config.json')).toBe(true);
  });

  it('does not skip the local config when the user chooses overwrite during restore', async () => {
    vi.mocked(fileRepository.exists).mockResolvedValue(true);
    mocks.confirm.mockResolvedValue(true);
    render(<BackupSettings locale="zh-CN" />);

    fireEvent.click(screen.getByRole('button', { name: '整库恢复' }));

    await waitFor(() => expect(mocks.restoreWorkspace).toHaveBeenCalled());
    const options = mocks.restoreWorkspace.mock.calls[0][4] as { skipPaths: Set<string> };
    expect(options.skipPaths.size).toBe(0);
  });
});
