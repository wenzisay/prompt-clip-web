/**
 * 文件夹级配置服务
 *
 * 配置写入用户授权的 Prompt 数据目录，随目录一起迁移和备份。
 */

import type { WorkspaceRef } from '@/types/file';
import type { FileRepository } from '@/services/fileRepository';

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
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<FolderConfig> {
  try {
    const content = await repository.readText(workspace, CONFIG_FILENAME);
    return normalizeConfig(JSON.parse(content));
  } catch (error) {
    if (error instanceof Error && error.name !== 'NotFoundError') {
      console.warn('Failed to read folder config:', error);
    }
    return DEFAULT_CONFIG;
  }
}

export async function folderConfigExists(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<boolean> {
  return await repository.exists(workspace, CONFIG_FILENAME);
}

export async function writeFolderConfig(
  repository: FileRepository,
  workspace: WorkspaceRef,
  config: FolderConfig
): Promise<void> {
  const normalizedConfig = normalizeConfig(config);
  await repository.writeText(
    workspace,
    CONFIG_FILENAME,
    `${JSON.stringify(normalizedConfig, null, 2)}\n`
  );
}

export async function updatePinnedTags(
  repository: FileRepository,
  workspace: WorkspaceRef,
  pinnedTags: string[]
): Promise<void> {
  const config = await readFolderConfig(repository, workspace);
  await writeFolderConfig(repository, workspace, {
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
