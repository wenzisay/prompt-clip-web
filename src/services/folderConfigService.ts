/**
 * 文件夹级配置服务
 *
 * 配置写入用户授权的 Prompt 数据目录，随目录一起迁移和备份。
 */

import type { WorkspaceRef } from '@/types/file';
import type { FileRepository } from '@/services/fileRepository';

const CONFIG_FILENAME = '.promptclip.json';

export interface FolderConfig {
  historyVersions: HistoryVersionSettings;
  pinnedTags: string[];
}

export interface HistoryVersionSettings {
  enabled: boolean;
  retentionDays: number;
}

const DEFAULT_HISTORY_VERSION_SETTINGS: HistoryVersionSettings = {
  enabled: false,
  retentionDays: 30,
};

const DEFAULT_CONFIG: FolderConfig = {
  historyVersions: DEFAULT_HISTORY_VERSION_SETTINGS,
  pinnedTags: [],
};

function normalizeConfig(input: unknown): FolderConfig {
  if (!input || typeof input !== 'object') {
    return DEFAULT_CONFIG;
  }

  const pinnedTags = (input as Partial<FolderConfig>).pinnedTags;
  const historyVersions = normalizeHistoryVersionSettings(
    (input as Partial<FolderConfig>).historyVersions
  );

  return {
    historyVersions,
    pinnedTags: Array.isArray(pinnedTags)
      ? Array.from(new Set(pinnedTags.filter((tag): tag is string => typeof tag === 'string')))
      : [],
  };
}

function normalizeHistoryVersionSettings(input: unknown): HistoryVersionSettings {
  if (!input || typeof input !== 'object') {
    return DEFAULT_HISTORY_VERSION_SETTINGS;
  }

  const settings = input as Partial<HistoryVersionSettings>;
  const inputRetentionDays = settings.retentionDays;
  const retentionDays = typeof inputRetentionDays === 'number' && Number.isInteger(inputRetentionDays)
    ? inputRetentionDays
    : DEFAULT_HISTORY_VERSION_SETTINGS.retentionDays;

  return {
    enabled: settings.enabled === true,
    retentionDays: Math.max(1, retentionDays),
  };
}

export async function readFolderConfig(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<FolderConfig> {
  try {
    if (!await repository.exists(workspace, CONFIG_FILENAME)) {
      return DEFAULT_CONFIG;
    }

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

export async function updateHistoryVersionSettings(
  repository: FileRepository,
  workspace: WorkspaceRef,
  historyVersions: HistoryVersionSettings
): Promise<void> {
  const config = await readFolderConfig(repository, workspace);
  await writeFolderConfig(repository, workspace, {
    ...config,
    historyVersions,
  });
}

export const FolderConfigService = {
  folderConfigExists,
  readFolderConfig,
  writeFolderConfig,
  updateHistoryVersionSettings,
  updatePinnedTags,
} as const;
