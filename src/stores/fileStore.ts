/**
 * 文件系统状态管理
 *
 * 管理目录句柄、权限状态等
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FileState {
  /** 浏览器是否支持 File System Access API */
  isSupported: boolean;
  /** 是否已授权访问目录 */
  isAuthorized: boolean;
  /** 当前目录句柄（不持久化） */
  directoryHandle: FileSystemDirectoryHandle | null;
  /** 当前目录名称（用于显示） */
  directoryName: string | null;
  /** 目录最后访问时间 */
  lastAccessTime: Date | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 设置目录授权状态 */
  setAuthorized: (authorized: boolean, directoryName?: string, directoryHandle?: FileSystemDirectoryHandle | null) => void;
  /** 清除目录信息 */
  clearDirectory: () => void;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
  /** 初始化支持状态 */
  initialize: () => void;
}

export const useFileStore = create<FileState>()(
  persist(
    (set) => ({
      isSupported: false,
      isAuthorized: false,
      directoryHandle: null,
      directoryName: null,
      lastAccessTime: null,
      isLoading: false,
      error: null,

      setAuthorized: (authorized, directoryName, directoryHandle) =>
        set({
          isAuthorized: authorized,
          directoryName: directoryName || null,
          directoryHandle: directoryHandle || null,
          lastAccessTime: new Date(),
          error: null,
        }),

      clearDirectory: () =>
        set({
          isAuthorized: false,
          directoryHandle: null,
          directoryName: null,
          lastAccessTime: null,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      initialize: () =>
        set({
          isSupported: 'showDirectoryPicker' in window,
        }),
    }),
    {
      name: 'promptclip-file-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分字段（不持久化 directoryHandle）
      partialize: (state) => ({
        isAuthorized: state.isAuthorized,
        directoryName: state.directoryName,
        lastAccessTime: state.lastAccessTime,
      }),
    }
  )
);
