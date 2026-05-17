import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';
const PERMISSION: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };

function workspaceFromHandle(handle: FileSystemDirectoryHandle): WorkspaceRef {
  return {
    id: `web:${handle.name}`,
    name: handle.name,
    platform: 'web',
    handleKey: DIRECTORY_KEY,
  };
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    'indexedDB' in window
  );
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, DIRECTORY_KEY));
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isSupported()) {
    return null;
  }

  const handle = await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) =>
    store.get(DIRECTORY_KEY)
  );

  return handle ?? null;
}

async function deleteSavedDirectoryHandle(): Promise<void> {
  if (!isSupported()) {
    return;
  }

  await withStore('readwrite', (store) => store.delete(DIRECTORY_KEY));
}

async function resolveParentDirectory(
  root: FileSystemDirectoryHandle,
  path: string,
  createDirectories: boolean
): Promise<{ directory: FileSystemDirectoryHandle; name: string }> {
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');
  const name = parts.pop();

  if (!name) {
    throw new Error('文件名不能为空');
  }

  let directory = root;
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: createDirectories });
  }

  return { directory, name };
}

async function getFileEntry(path: string, handle: FileSystemFileHandle): Promise<FileEntry> {
  const file = await handle.getFile();

  return {
    name: handle.name,
    path: normalizeRelativePath(path),
    size: file.size,
    modifiedAt: new Date(file.lastModified),
  };
}

async function requireSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
  const handle = await getSavedDirectoryHandle();

  if (!handle) {
    throw new Error('未选择工作目录');
  }

  return handle;
}

async function selectDirectory(): Promise<WorkspaceRef | null> {
  if (!isSupported()) {
    throw new Error('当前浏览器不支持文件系统 API，请使用 Chrome 86+ 或 Edge 86+');
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });
    await saveDirectoryHandle(handle);
    return workspaceFromHandle(handle);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

async function restoreDirectory(): Promise<WorkspaceRef | null> {
  const handle = await getSavedDirectoryHandle();
  return handle ? workspaceFromHandle(handle) : null;
}

async function verifyPermission(): Promise<boolean> {
  const handle = await getSavedDirectoryHandle();

  if (!handle) {
    return false;
  }

  try {
    if ((await handle.queryPermission(PERMISSION)) === 'granted') {
      return true;
    }
    return (await handle.requestPermission(PERMISSION)) === 'granted';
  } catch {
    return false;
  }
}

async function clearSavedWorkspace(): Promise<void> {
  await deleteSavedDirectoryHandle();
}

async function listFiles(
  _workspace: WorkspaceRef,
  extensions: string[] = [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
  options?: { includeHiddenDirectories?: boolean }
): Promise<FileEntry[]> {
  const root = await requireSavedDirectoryHandle();
  const files: FileEntry[] = [];
  const normalizedExtensions = extensions.map((extension) => extension.toLowerCase());

  async function traverse(directory: FileSystemDirectoryHandle, currentPath: string): Promise<void> {
    for await (const entry of directory.values()) {
      const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;

      if (entry.kind === 'file') {
        const lowerPath = path.toLowerCase();
        if (normalizedExtensions.some((extension) => lowerPath.endsWith(extension))) {
          files.push(await getFileEntry(path, entry as FileSystemFileHandle));
        }
      } else if (
        options?.includeHiddenDirectories ||
        !entry.name.startsWith('.')
      ) {
        await traverse(entry as FileSystemDirectoryHandle, path);
      }
    }
  }

  await traverse(root, '');
  return files;
}

async function readText(_workspace: WorkspaceRef, path: string): Promise<string> {
  const root = await requireSavedDirectoryHandle();
  const { directory, name } = await resolveParentDirectory(root, path, false);
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  return file.text();
}

async function writeText(
  _workspace: WorkspaceRef,
  path: string,
  content: string
): Promise<FileEntry> {
  const root = await requireSavedDirectoryHandle();
  const { directory, name } = await resolveParentDirectory(root, path, true);
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();

  await writable.write(content);
  await writable.close();

  return getFileEntry(path, handle);
}

async function exists(_workspace: WorkspaceRef, path: string): Promise<boolean> {
  const root = await requireSavedDirectoryHandle();
  const { directory, name } = await resolveParentDirectory(root, path, false);

  try {
    await directory.getFileHandle(name);
    return true;
  } catch {
    try {
      await directory.getDirectoryHandle(name);
      return true;
    } catch {
      return false;
    }
  }
}

async function move(workspace: WorkspaceRef, from: string, to: string): Promise<void> {
  const content = await readText(workspace, from);
  await writeText(workspace, to, content);
  await remove(workspace, from);
}

async function mkdir(_workspace: WorkspaceRef, path: string): Promise<void> {
  const root = await requireSavedDirectoryHandle();
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');
  let directory = root;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: true });
  }
}

async function remove(_workspace: WorkspaceRef, path: string): Promise<void> {
  const root = await requireSavedDirectoryHandle();
  const { directory, name } = await resolveParentDirectory(root, path, false);
  await directory.removeEntry(name, { recursive: true });
}

export const webFileRepository: FileRepository = {
  isSupported,
  selectDirectory,
  restoreDirectory,
  verifyPermission,
  clearSavedWorkspace,
  listFiles,
  readText,
  writeText,
  exists,
  move,
  mkdir,
  remove,
};
