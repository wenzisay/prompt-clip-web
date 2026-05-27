/**
 * 文件系统状态管理
 *
 * 管理工作区、权限状态等
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_LOCALE, messages } from '@/i18n/messages';
import type { WorkspaceRef } from '@/types/file';
import { fileRepository } from '@/services/fileRepository';

interface FileState {
  /** 浏览器是否支持 File System Access API */
  isSupported: boolean;
  /** 是否已授权访问目录 */
  isAuthorized: boolean;
  /** 当前工作区（不持久化） */
  workspace: WorkspaceRef | null;
  /** 当前工作区名称（用于显示） */
  workspaceName: string | null;
  /** 目录最后访问时间 */
  lastAccessTime: Date | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 设置当前工作区 */
  setWorkspace: (workspace: WorkspaceRef | null) => void;
  /** 清除工作区信息 */
  clearWorkspace: () => Promise<void>;
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;
  /** 设置错误信息 */
  setError: (error: string | null) => void;
  /** 初始化支持状态 */
  initialize: () => Promise<void>;
}

export const useFileStore = create<FileState>()(
  persist(
    (set) => ({
      isSupported: false,
      isAuthorized: false,
      workspace: null,
      workspaceName: null,
      lastAccessTime: null,
      isLoading: false,
      error: null,

      setWorkspace: (workspace) => {
        set({
          isAuthorized: Boolean(workspace),
          workspace,
          workspaceName: workspace?.name ?? null,
          lastAccessTime: workspace ? new Date() : null,
          error: null,
        });
      },

      clearWorkspace: async () => {
        set({
          isAuthorized: false,
          workspace: null,
          workspaceName: null,
          lastAccessTime: null,
          error: null,
        });

        try {
          await fileRepository.clearSavedWorkspace();
        } catch (error) {
          console.warn('Failed to clear saved workspace:', error);
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      initialize: async () => {
        const isSupported = fileRepository.isSupported();
        set({ isSupported });

        if (!isSupported) {
          set({
            isAuthorized: false,
            workspace: null,
            workspaceName: null,
            lastAccessTime: null,
            error: null,
          });
          return;
        }

        try {
          const workspace = await fileRepository.restoreDirectory();
          if (!workspace) {
            set({
              isAuthorized: false,
              workspace: null,
              workspaceName: null,
              lastAccessTime: null,
              error: null,
            });
            return;
          }

          const permission = await fileRepository.verifyPermission(workspace);
          set({
            isAuthorized: permission,
            workspace: permission ? workspace : null,
            workspaceName: permission ? workspace.name : null,
            lastAccessTime: permission ? new Date() : null,
            error: permission ? null : messages[DEFAULT_LOCALE].app.workspacePermissionExpired,
          });
        } catch (error) {
          console.warn('Failed to restore workspace:', error);
          set({
            isAuthorized: false,
            workspace: null,
            workspaceName: null,
            lastAccessTime: null,
            error: null,
          });
        }
      },
    }),
    {
      name: 'promptclip-file-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化部分字段（不持久化 workspace）
      partialize: (state) => ({
        isAuthorized: state.isAuthorized,
        workspaceName: state.workspaceName,
        lastAccessTime: state.lastAccessTime,
      }),
    }
  )
);
