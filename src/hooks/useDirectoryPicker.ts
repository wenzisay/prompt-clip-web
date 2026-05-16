/**
 * 目录选择 Hook
 *
 * 封装目录选择逻辑，包括错误处理和状态管理
 */

import { useCallback, useEffect } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { FileService } from '@/services/fileService';

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
  openDirectory: () => Promise<FileSystemDirectoryHandle | null>;
  /** 清除当前目录 */
  clearDirectory: () => void;
}

export function useDirectoryPicker(): UseDirectoryPickerReturn {
  const {
    isSupported,
    isAuthorized,
    isLoading,
    error,
    setAuthorized,
    setLoading,
    setError,
    clearDirectory: clearDir,
    initialize,
  } = useFileStore();

  // 初始化支持状态
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 打开目录选择器
  const openDirectory = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    setError(null);
    setLoading(true);

    try {
      const handle = await FileService.openDirectory();

      if (handle) {
        // 请求权限
        const hasPermission = await FileService.verifyPermission(handle);
        if (hasPermission) {
          setAuthorized(true, handle.name, handle);
          return handle;
        } else {
          setError('未授予目录访问权限');
          setAuthorized(false);
          return null;
        }
      } else {
        // 用户取消
        setLoading(false);
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '打开目录失败';
      setError(message);
      setAuthorized(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setAuthorized]);

  // 清除当前目录
  const clearDirectory = useCallback(() => {
    clearDir();
  }, [clearDir]);

  return {
    isAuthorized,
    isSupported,
    isLoading,
    error,
    openDirectory,
    clearDirectory,
  };
}
