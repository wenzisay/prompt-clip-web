import { invoke } from '@tauri-apps/api/core';
import type {
  ArchivePreview,
  ExternalScanResult,
  ImportDecision,
  ImportOutcome,
  SkillManagerInitialization,
  SkillManagerSettings,
  SkillScanResponse,
  SkillFileEntry,
  SkillManagerError,
  SkillDeleteMode,
  SkillTextFile,
  SkillTextWriteResult,
  SkillSettingsUpdateResult,
  SyncMode,
  ToolSyncMode,
  SyncOperationResult,
} from '@/types/skill';
import { isTauriRuntime } from './fileRepository/tauriFileRepository';

export interface SetSkillEnabledOptions {
  skillId: string;
  targetGroupId: string;
  enabled: boolean;
}

export type ForceEnableSkillOptions = Omit<SetSkillEnabledOptions, 'enabled'>;

export interface ImportExternalSkillOptions {
  skillId: string;
  contentHash: string;
  targetGroupId: string;
  decision: ImportDecision;
}

function requireDesktop(): void {
  if (!isTauriRuntime()) {
    throw {
      code: 'skill_desktop_only',
      params: {},
    };
  }
}

export async function initializeSkillManager(): Promise<SkillManagerInitialization> {
  requireDesktop();
  return invoke('skill_initialize');
}

export async function scanSkills(): Promise<SkillScanResponse> {
  requireDesktop();
  return invoke('skill_scan');
}

export async function scanExternalSkills(): Promise<ExternalScanResult> {
  requireDesktop();
  return invoke('skill_scan_external');
}

export async function revealExternalSkill(
  targetGroupId: string,
  directoryName: string
): Promise<void> {
  requireDesktop();
  await invoke('skill_reveal_external', { targetGroupId, directoryName });
}

export async function revealHubSkill(): Promise<void> {
  requireDesktop();
  await invoke('skill_reveal_hub');
}

export async function setSkillEnabled(
  options: SetSkillEnabledOptions
): Promise<SyncOperationResult> {
  requireDesktop();
  return invoke('skill_set_tool_enabled', { ...options });
}

export async function forceEnableSkill(
  options: ForceEnableSkillOptions
): Promise<SyncOperationResult> {
  requireDesktop();
  return invoke('skill_force_enable', { ...options });
}

export async function importExternalSkill(
  options: ImportExternalSkillOptions
): Promise<SkillScanResponse> {
  requireDesktop();
  return invoke('skill_import_external', { ...options });
}

export async function previewSkillArchive(archivePath: string): Promise<ArchivePreview> {
  requireDesktop();
  return invoke('skill_preview_archive', { archivePath });
}

export async function importSkillArchive(
  archivePath: string,
  decision: ImportDecision
): Promise<ImportOutcome> {
  requireDesktop();
  return invoke('skill_import_archive', { archivePath, decision });
}

export async function exportSkill(
  skillId: string,
  destinationPath: string
): Promise<void> {
  requireDesktop();
  await invoke('skill_export', { skillId, destinationPath });
}

export async function setSkillFavorite(
  skillId: string,
  favoritedAt: string | null
): Promise<SkillManagerSettings> {
  requireDesktop();
  return invoke('skill_set_favorite', { skillId, favoritedAt });
}

export async function createSkill(skillId: string, description: string): Promise<void> {
  requireDesktop();
  await invoke('skill_create', { skillId, description });
}

export async function deleteSkill(skillId: string, mode: SkillDeleteMode): Promise<void> {
  requireDesktop();
  await invoke('skill_delete', { skillId, mode });
}

export async function listSkillFiles(skillId: string): Promise<SkillFileEntry[]> {
  requireDesktop();
  return invoke('skill_list_files', { skillId });
}

export async function readSkillTextFile(
  skillId: string,
  relativePath: string
): Promise<SkillTextFile> {
  requireDesktop();
  return invoke('skill_read_text_file', { skillId, relativePath });
}

export async function writeSkillTextFile(
  skillId: string,
  relativePath: string,
  content: string,
  expectedModifiedAtMs: number
): Promise<SkillTextWriteResult> {
  requireDesktop();
  return invoke('skill_write_text_file', {
    skillId,
    relativePath,
    content,
    expectedModifiedAtMs,
  });
}

export async function createSkillDirectory(
  skillId: string,
  relativePath: string
): Promise<SkillManagerError[]> {
  requireDesktop();
  return invoke('skill_create_directory', { skillId, relativePath });
}

export async function createSkillTextFile(
  skillId: string,
  relativePath: string
): Promise<SkillTextWriteResult> {
  requireDesktop();
  return invoke('skill_create_text_file', { skillId, relativePath });
}

export async function renameSkillEntry(
  skillId: string,
  sourceRelativePath: string,
  destinationRelativePath: string
): Promise<SkillManagerError[]> {
  requireDesktop();
  return invoke('skill_rename_entry', {
    skillId,
    sourceRelativePath,
    destinationRelativePath,
  });
}

export async function uploadSkillFile(
  skillId: string,
  sourcePath: string,
  destinationRelativePath: string
): Promise<SkillManagerError[]> {
  requireDesktop();
  return invoke('skill_upload_file', { skillId, sourcePath, destinationRelativePath });
}

export async function uploadSkillBytes(
  skillId: string,
  destinationRelativePath: string,
  bytes: Uint8Array
): Promise<SkillManagerError[]> {
  requireDesktop();
  // 沿用 workspace 仓库的字节 IPC 约定：Uint8Array → number[] → Rust Vec<u8>
  return invoke('skill_upload_bytes', {
    skillId,
    destinationRelativePath,
    content: Array.from(bytes),
  });
}

export async function deleteSkillEntry(
  skillId: string,
  relativePath: string
): Promise<SkillManagerError[]> {
  requireDesktop();
  return invoke('skill_delete_entry', { skillId, relativePath });
}

export async function downloadSkillFile(
  skillId: string,
  relativePath: string,
  destinationPath: string
): Promise<void> {
  requireDesktop();
  await invoke('skill_download_file', { skillId, relativePath, destinationPath });
}

export async function updateSkillSettings(
  defaultSyncMode: SyncMode,
  toolOverrides: Record<string, ToolSyncMode>
): Promise<SkillSettingsUpdateResult> {
  requireDesktop();
  return invoke('skill_update_settings', { defaultSyncMode, toolOverrides });
}

export const SkillService = {
  initialize: initializeSkillManager,
  scan: scanSkills,
  scanExternal: scanExternalSkills,
  revealExternal: revealExternalSkill,
  revealHub: revealHubSkill,
  setEnabled: setSkillEnabled,
  forceEnable: forceEnableSkill,
  importExternal: importExternalSkill,
  previewArchive: previewSkillArchive,
  importArchive: importSkillArchive,
  export: exportSkill,
  setFavorite: setSkillFavorite,
  create: createSkill,
  delete: deleteSkill,
  listFiles: listSkillFiles,
  readTextFile: readSkillTextFile,
  writeTextFile: writeSkillTextFile,
  createDirectory: createSkillDirectory,
  createTextFile: createSkillTextFile,
  renameEntry: renameSkillEntry,
  uploadFile: uploadSkillFile,
  uploadBytes: uploadSkillBytes,
  deleteEntry: deleteSkillEntry,
  downloadFile: downloadSkillFile,
  updateSettings: updateSkillSettings,
} as const;
