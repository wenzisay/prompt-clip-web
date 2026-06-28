import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';
const DIRECTORY_PICKER_ID = 'promptclip-workspace';
const READ_PERMISSION: FileSystemHandlePermissionDescriptor = { mode: 'read' };
const READ_WRITE_PERMISSION: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };

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
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    let isClosed = false;
    const closeDatabase = () => {
      if (!isClosed) {
        db.close();
        isClosed = true;
      }
    };
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      closeDatabase();
      reject(request.error);
    };
    transaction.oncomplete = closeDatabase;
    transaction.onerror = () => {
      closeDatabase();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      closeDatabase();
      reject(transaction.error);
    };
  });
}

async function withWriteStore(operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    let isClosed = false;
    const closeDatabase = () => {
      if (!isClosed) {
        db.close();
        isClosed = true;
      }
    };
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    request.onerror = () => {
      closeDatabase();
      reject(request.error);
    };
    transaction.oncomplete = () => {
      closeDatabase();
      resolve();
    };
    transaction.onerror = () => {
      closeDatabase();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      closeDatabase();
      reject(transaction.error);
    };
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await withWriteStore((store) => store.put(handle, DIRECTORY_KEY));
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isSupported()) {
    return null;
  }

  const handle = await withStore<FileSystemDirectoryHandle | undefined>((store) =>
    store.get(DIRECTORY_KEY)
  );

  return handle ?? null;
}

async function deleteSavedDirectoryHandle(): Promise<void> {
  if (!isSupported()) {
    return;
  }

  await withWriteStore((store) => store.delete(DIRECTORY_KEY));
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

async function requireSavedDirectoryHandle(
  permission: FileSystemHandlePermissionDescriptor = READ_PERMISSION
): Promise<FileSystemDirectoryHandle> {
  const handle = await getSavedDirectoryHandle();

  if (!handle) {
    throw new Error('未选择工作目录');
  }

  // 确保当前会话的文件读写权限处于激活态。Chrome 扩展 side panel 中，从 IndexedDB 恢复的
  // handle 即便 queryPermission 显示 granted，getDirectoryHandle（遍历子目录）/createWritable
  // 等操作仍可能抛 NotAllowedError——permission grant 不自动跨会话延续，需经 requestPermission
  // 激活（已 granted 时静默返回、无需用户手势）。
  try {
    await handle.requestPermission(permission);
  } catch {
    // 权限为 prompt 且当前无 transient user activation 时 requestPermission 抛 SecurityError，
    // 忽略；后续操作按实际权限行为，由上层（verifyPermission / UI）引导重新授权。
  }

  return handle;
}

async function selectDirectory(): Promise<WorkspaceRef | null> {
  if (!isSupported()) {
    throw new Error('当前浏览器不支持文件系统 API，请使用 Chrome 86+ 或 Edge 86+');
  }

  try {
    const previousHandle = await getSavedDirectoryHandle();
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: previousHandle ?? 'documents',
      id: DIRECTORY_PICKER_ID,
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
    // 启动恢复只需要读权限。写入权限在实际写文件时再申请，避免 readwrite 在扩展
    // side panel 新会话中需要用户手势，导致已保存目录无法直接进入。
    return (await handle.requestPermission(READ_PERMISSION)) === 'granted';
  } catch {
    // 权限为 prompt 且当前无 transient user activation 时 requestPermission 抛 SecurityError。
    return (await handle.queryPermission(READ_PERMISSION)) === 'granted';
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
  const root = await requireSavedDirectoryHandle(READ_PERMISSION);
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
  const root = await requireSavedDirectoryHandle(READ_PERMISSION);
  const { directory, name } = await resolveParentDirectory(root, path, false);
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  return file.text();
}

async function readTextHead(
  _workspace: WorkspaceRef,
  path: string,
  byteLimit: number
): Promise<string> {
  const root = await requireSavedDirectoryHandle(READ_PERMISSION);
  const { directory, name } = await resolveParentDirectory(root, path, false);
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  if (file.size <= byteLimit) {
    return file.text();
  }
  const slice = file.slice(0, byteLimit);
  return slice.text();
}

async function writeText(
  _workspace: WorkspaceRef,
  path: string,
  content: string
): Promise<FileEntry> {
  const root = await requireSavedDirectoryHandle(READ_WRITE_PERMISSION);
  const { directory, name } = await resolveParentDirectory(root, path, true);
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();

  await writable.write(content);
  await writable.close();

  return getFileEntry(path, handle);
}

async function readBinary(_workspace: WorkspaceRef, path: string): Promise<Uint8Array> {
  const root = await requireSavedDirectoryHandle(READ_PERMISSION);
  const { directory, name } = await resolveParentDirectory(root, path, false);
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

async function writeBinary(
  _workspace: WorkspaceRef,
  path: string,
  content: Uint8Array
): Promise<FileEntry> {
  const root = await requireSavedDirectoryHandle(READ_WRITE_PERMISSION);
  const { directory, name } = await resolveParentDirectory(root, path, true);
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();

  await writable.write(content);
  await writable.close();

  return getFileEntry(path, handle);
}

async function exists(_workspace: WorkspaceRef, path: string): Promise<boolean> {
  const root = await requireSavedDirectoryHandle(READ_PERMISSION);
  let directory: FileSystemDirectoryHandle;
  let name: string;

  try {
    ({ directory, name } = await resolveParentDirectory(root, path, false));
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }

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

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'NotFoundError'
  );
}

async function getFileHandleIfExists(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle | null> {
  try {
    const { directory, name } = await resolveParentDirectory(root, path, false);
    return await directory.getFileHandle(name);
  } catch {
    return null;
  }
}

async function move(workspace: WorkspaceRef, from: string, to: string): Promise<void> {
  const source = normalizeRelativePath(from);
  const target = normalizeRelativePath(to);

  if (source === target) {
    return;
  }

  const root = await requireSavedDirectoryHandle(READ_WRITE_PERMISSION);
  const sourceHandle = await getFileHandleIfExists(root, source);

  if (!sourceHandle) {
    throw new Error('文件不存在或已被移动');
  }

  const targetHandle = await getFileHandleIfExists(root, target);
  if (targetHandle && (await sourceHandle.isSameEntry(targetHandle))) {
    return;
  }

  const content = await readText(workspace, source);
  await writeText(workspace, target, content);
  await remove(workspace, source);
}

async function mkdir(_workspace: WorkspaceRef, path: string): Promise<void> {
  const root = await requireSavedDirectoryHandle(READ_WRITE_PERMISSION);
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');
  let directory = root;

  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: true });
  }
}

async function remove(_workspace: WorkspaceRef, path: string): Promise<void> {
  const root = await requireSavedDirectoryHandle(READ_WRITE_PERMISSION);
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
  readTextHead,
  writeText,
  readBinary,
  writeBinary,
  exists,
  move,
  mkdir,
  remove,
};
