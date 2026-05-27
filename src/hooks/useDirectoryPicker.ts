/**
 * 目录选择 Hook
 *
 * 封装目录选择逻辑，包括错误处理和状态管理
 */

import { useCallback, useEffect } from 'react';
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
    setWorkspace,
    setLoading,
    setError,
    clearWorkspace,
    initialize,
  } = useFileStore();

  // 初始化支持状态
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 打开目录选择器
  const openDirectory = useCallback(async (): Promise<WorkspaceRef | null> => {
    setError(null);
    setLoading(true);

    try {
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
  }, [setError, setLoading, setWorkspace, t.app.openDirectoryFailed, t.app.permissionDenied]);

  // 清除当前目录
  const clearDirectory = useCallback(async () => {
    await clearWorkspace();
  }, [clearWorkspace]);

  return {
    isAuthorized,
    isSupported,
    isLoading,
    error,
    openDirectory,
    clearDirectory,
  };
}
