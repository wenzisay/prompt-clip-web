/**
 * 文件系统访问 API 相关类型
 */

/**
 * 目录权限状态
 */
export type DirectoryPermission = 'granted' | 'denied' | 'prompt';

/**
 * 目录信息
 */
export interface DirectoryInfo {
  /** 目录句柄 */
  handle: FileSystemDirectoryHandle;
  /** 权限状态 */
  permission: DirectoryPermission;
  /** 目录路径（用于显示） */
  path: string;
  /** 最后访问时间 */
  lastAccessed: Date;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件名 */
  name: string;
  /** 文件路径（相对路径） */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时间 */
  modifiedAt: Date;
}

/**
 * 文件系统支持的类型
 */
export const SUPPORTED_FILE_EXTENSIONS = ['.md'] as const;
export type SupportedFileExtension = typeof SUPPORTED_FILE_EXTENSIONS[number];
