/**
 * 文件系统状态管理
 *
 * 管理目录句柄、权限状态等
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FileService } from '@/services/fileService';

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, DIRECTORY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDB();
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(DIRECTORY_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function deleteSavedDirectoryHandle(): Promise<void> {
  const db = await openHandleDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(DIRECTORY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

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
  initialize: () => Promise<void>;
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

      setAuthorized: (authorized, directoryName, directoryHandle) => {
        if (directoryHandle) {
          saveDirectoryHandle(directoryHandle).catch((error) => {
            console.warn('Failed to persist directory handle:', error);
          });
        }

        set({
          isAuthorized: authorized,
          directoryName: directoryName || null,
          directoryHandle: directoryHandle || null,
          lastAccessTime: new Date(),
          error: null,
        });
      },

      clearDirectory: () => {
        deleteSavedDirectoryHandle().catch((error) => {
          console.warn('Failed to clear directory handle:', error);
        });

        set({
          isAuthorized: false,
          directoryHandle: null,
          directoryName: null,
          lastAccessTime: null,
          error: null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      initialize: async () => {
        const isSupported = FileService.isFileAPISupported();
        set({ isSupported });

        if (!isSupported || !('indexedDB' in window)) {
          set({ isAuthorized: false, directoryHandle: null });
          return;
        }

        try {
          const handle = await getSavedDirectoryHandle();
          if (!handle) {
            set({ isAuthorized: false, directoryHandle: null });
            return;
          }

          const permission = await handle.queryPermission({ mode: 'readwrite' });
          set({
            isAuthorized: permission === 'granted',
            directoryHandle: permission === 'granted' ? handle : null,
            directoryName: handle.name,
            error: permission === 'granted' ? null : '目录访问权限已过期，请重新选择数据目录',
          });
        } catch (error) {
          console.warn('Failed to restore directory handle:', error);
          set({ isAuthorized: false, directoryHandle: null });
        }
      },
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
