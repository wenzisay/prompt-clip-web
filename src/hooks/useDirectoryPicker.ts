/**
 * 目录选择 Hook
 *
 * 封装目录选择逻辑，包括错误处理和状态管理
 */

import { useCallback } from 'react';
import { useTranslation } from '@/i18n';
import type { WorkspaceRef } from '@/types/file';
import { useFileStore } from '@/stores/fileStore';
import { fileRepository } from '@/services/fileRepository';

interface UseDirectoryPickerReturn {
  /** 是否已授权 */
  isAuthorized: boolean;
  /** 浏览器是否支持 */
  isSupported: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 上次保存但需要重新授权的工作区 */
  pendingWorkspace: WorkspaceRef | null;
  /** 打开目录选择器 */
  openDirectory: () => Promise<WorkspaceRef | null>;
  /** 清除当前目录 */
  clearDirectory: () => Promise<void>;
}

export function useDirectoryPicker(): UseDirectoryPickerReturn {
  const { t } = useTranslation();
  const {
    isSupported,
    isAuthorized,
    isLoading,
    error,
    pendingWorkspace,
    setWorkspace,
    setPendingWorkspace,
    setLoading,
    setError,
    clearWorkspace,
  } = useFileStore();

  // 打开目录选择器
  const openDirectory = useCallback(async (): Promise<WorkspaceRef | null> => {
    setError(null);
    setLoading(true);

    try {
      // 优先恢复已保存目录：句柄持久存于 IndexedDB，但 Chrome 的 FSA 写权限在 side panel
      // 重新打开（新会话）后通常需重新确认。此处借本次按钮点击的用户手势直接
      // requestPermission 恢复，避免用户再次在文件选择器里挑选目录。
      const existing = pendingWorkspace ?? await fileRepository.restoreDirectory();
      if (existing) {
        const existingPermission = await fileRepository.verifyPermission(existing);
        if (existingPermission) {
          setWorkspace(existing);
          return existing;
        }

        setPendingWorkspace(pendingWorkspace ? null : existing);
        setError(t.app.permissionDenied);
        return null;
      }

      const workspace = await fileRepository.selectDirectory();

      if (workspace) {
        const hasPermission = await fileRepository.verifyPermission(workspace);
        if (hasPermission) {
          setWorkspace(workspace);
          return workspace;
        }

        setError(t.app.permissionDenied);
        setWorkspace(null);
        return null;
      }

      setLoading(false);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : t.app.openDirectoryFailed;
      setError(message);
      setWorkspace(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    pendingWorkspace,
    setError,
    setLoading,
    setPendingWorkspace,
    setWorkspace,
    t.app.openDirectoryFailed,
    t.app.permissionDenied,
  ]);

  // 清除当前目录
  const clearDirectory = useCallback(async () => {
    await clearWorkspace();
  }, [clearWorkspace]);

  return {
    isAuthorized,
    isSupported,
    isLoading,
    error,
    pendingWorkspace,
    openDirectory,
    clearDirectory,
  };
}
