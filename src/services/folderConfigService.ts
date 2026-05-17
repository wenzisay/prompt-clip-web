/**
 * 文件夹级配置服务
 *
 * 配置写入用户授权的 Prompt 数据目录，随目录一起迁移和备份。
 */

import { FileService } from '@/services/fileService';

const CONFIG_FILENAME = '.promptclip.json';

export interface FolderConfig {
  pinnedTags: string[];
}

const DEFAULT_CONFIG: FolderConfig = {
  pinnedTags: [],
};

function normalizeConfig(input: unknown): FolderConfig {
  if (!input || typeof input !== 'object') {
    return DEFAULT_CONFIG;
  }

  const pinnedTags = (input as Partial<FolderConfig>).pinnedTags;

  return {
    pinnedTags: Array.isArray(pinnedTags)
      ? Array.from(new Set(pinnedTags.filter((tag): tag is string => typeof tag === 'string')))
      : [],
  };
}

export async function readFolderConfig(
  directoryHandle: FileSystemDirectoryHandle
): Promise<FolderConfig> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(CONFIG_FILENAME);
    const content = await FileService.readFile(fileHandle);
    return normalizeConfig(JSON.parse(content));
  } catch (error) {
    if (error instanceof Error && error.name !== 'NotFoundError') {
      console.warn('Failed to read folder config:', error);
    }
    return DEFAULT_CONFIG;
  }
}

export async function folderConfigExists(
  directoryHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    await directoryHandle.getFileHandle(CONFIG_FILENAME);
    return true;
  } catch {
    return false;
  }
}

export async function writeFolderConfig(
  directoryHandle: FileSystemDirectoryHandle,
  config: FolderConfig
): Promise<void> {
  const normalizedConfig = normalizeConfig(config);
  await FileService.writeFile(
    directoryHandle,
    CONFIG_FILENAME,
    `${JSON.stringify(normalizedConfig, null, 2)}\n`
  );
}

export async function updatePinnedTags(
  directoryHandle: FileSystemDirectoryHandle,
  pinnedTags: string[]
): Promise<void> {
  const config = await readFolderConfig(directoryHandle);
  await writeFolderConfig(directoryHandle, {
    ...config,
    pinnedTags,
  });
}

export const FolderConfigService = {
  folderConfigExists,
  readFolderConfig,
  writeFolderConfig,
  updatePinnedTags,
} as const;
