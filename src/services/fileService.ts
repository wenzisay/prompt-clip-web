/**
 * File System Access API 封装服务
 *
 * 提供目录选择、文件读写、递归扫描等功能
 */

import { CONFIG } from '@/constants/config';

/**
 * 浏览器兼容性检查
 */
export function isFileAPISupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * 打开目录选择器
 * 用户选择一个目录并授予读/写权限
 */
export async function openDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileAPISupported()) {
    throw new Error('当前浏览器不支持文件系统 API，请使用 Chrome 86+ 或 Edge 86+');
  }

  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });
    return handle;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null; // 用户取消
    }
    throw error;
  }
}

/**
 * 验证目录权限
 */
export async function verifyPermission(
  directoryHandle: FileSystemDirectoryHandle,
  // readWrite 参数保留用于未来扩展
  _readWrite = false
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };

  try {
    // 请求权限
    if ((await directoryHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    // 如果没有权限，请求权限
    return (await directoryHandle.requestPermission(options)) === 'granted';
  } catch {
    return false;
  }
}

/**
 * 递归扫描目录，获取所有支持的文件
 */
export async function listFiles(
  directoryHandle: FileSystemDirectoryHandle,
  extensions = CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS
): Promise<FileSystemFileHandle[]> {
  const files: FileSystemFileHandle[] = [];

  async function traverse(dirHandle: FileSystemDirectoryHandle) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (extensions.some(ext => name.endsWith(ext))) {
          files.push(entry as FileSystemFileHandle);
        }
      } else if (entry.kind === 'directory') {
        // 跳过隐藏目录
        if (!entry.name.startsWith('.')) {
          await traverse(entry as FileSystemDirectoryHandle);
        }
      }
    }
  }

  await traverse(directoryHandle);
  return files;
}

/**
 * 读取文件内容
 */
export async function readFile(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  const text = await file.text();
  return text;
}

/**
 * 写入文件内容
 * 如果文件不存在则创建，存在则覆盖
 */
export async function writeFile(
  directoryHandle: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<FileSystemFileHandle> {
  const fileHandle = await directoryHandle.getFileHandle(filename, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return fileHandle;
}

/**
 * 删除文件
 */
export async function deleteFile(
  directoryHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<void> {
  await directoryHandle.removeEntry(filename);
}

/**
 * 移动/重命名文件
 */
export async function moveFile(
  directoryHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<void> {
  // File System Access API 在某些版本可能不支持直接重命名
  // 使用复制+删除的方式实现
  const oldFileHandle = await directoryHandle.getFileHandle(oldName);
  const content = await readFile(oldFileHandle);
  await writeFile(directoryHandle, newName, content);
  await deleteFile(directoryHandle, oldName);
}

/**
 * 创建目录
 */
export async function createDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  dirname: string
): Promise<FileSystemDirectoryHandle> {
  return await directoryHandle.getDirectoryHandle(dirname, { create: true });
}

/**
 * 检查文件是否存在
 */
export async function fileExists(
  directoryHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<boolean> {
  try {
    await directoryHandle.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取文件最后修改时间
 */
export async function getFileModTime(fileHandle: FileSystemFileHandle): Promise<Date> {
  const file = await fileHandle.getFile();
  return new Date(file.lastModified);
}

/**
 * 获取文件大小
 */
export async function getFileSize(fileHandle: FileSystemFileHandle): Promise<number> {
  const file = await fileHandle.getFile();
  return file.size;
}

/**
 * 导出 FileService
 */
export const FileService = {
  isFileAPISupported,
  openDirectory,
  verifyPermission,
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  moveFile,
  createDirectory,
  fileExists,
  getFileModTime,
  getFileSize,
} as const;
