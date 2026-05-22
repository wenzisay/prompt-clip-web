/**
 * Prompt CRUD 服务
 *
 * 处理 Prompt 的创建、读取、更新、删除操作
 */

import type { FileEntry, WorkspaceRef } from '@/types/file';
import type {
  CreatePromptInput,
  HistoryVersion,
  Prompt,
  PromptMetadata,
  UpdatePromptInput,
} from '@/types/prompt';
import type { FileRepository } from './fileRepository';
import {
  filenameFromId,
  filenameFromTitle,
  formatDateForFile,
  generateStableId,
  idFromFilename,
  isStableId,
  validatePromptTitleForFilename,
} from '@/utils/id';
import { joinPath } from '@/utils/path';
import {
  detectFrontmatterTagStyle,
  parseMarkdown,
  serializeMarkdown,
  extractTitle,
} from '@/utils/markdown';
import { CONFIG } from '@/constants/config';
import { FolderConfigService } from './folderConfigService';

const HISTORY_PATH_PREFIX = `${CONFIG.FILE_SYSTEM.HISTORY_DIR}/`;

interface ParsedPromptFile {
  entry: FileEntry;
  metadata: PromptMetadata;
  content: string;
  raw: string;
}

/**
 * 从文件加载 Prompt
 */
export async function loadPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry,
  effectiveStableId: string
): Promise<Prompt> {
  if (!isStableId(effectiveStableId)) {
    throw new Error('Prompt stable id is invalid');
  }

  const parsed = await readPromptFile(repository, workspace, entry);
  return buildPromptFromParsed(parsed, effectiveStableId);
}

/**
 * 加载目录中的所有 Prompts
 */
export async function loadPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<Prompt[]> {
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS]
  );
  const parsedFiles: ParsedPromptFile[] = [];

  for (const entry of entries) {
    try {
      parsedFiles.push(await readPromptFile(repository, workspace, entry));
    } catch (error) {
      console.error(`Failed to load prompt: ${entry.path}`, error);
    }
  }

  const idAssignments = assignEffectiveStableIds(parsedFiles);
  const prompts = await Promise.all(
    parsedFiles.map(async (parsed) => {
      const assignedId = getAssignedStableId(idAssignments, parsed.entry.path);
      let effectiveStableId = assignedId;
      let isTemporaryLegacyId = false;

      if (shouldWritePromptFileWithId(parsed, assignedId)) {
        try {
          await writePromptFileWithId(repository, workspace, parsed, assignedId);
        } catch (error) {
          console.error(`Failed to migrate prompt id for file: ${parsed.entry.path}`, error);
          effectiveStableId = idFromFilename(parsed.entry.path);
          isTemporaryLegacyId = true;
        }
      }

      return buildPromptFromParsed(parsed, effectiveStableId, isTemporaryLegacyId);
    })
  );

  // 按修改时间排序
  return prompts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * 创建新 Prompt
 */
export async function createPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  input: CreatePromptInput
): Promise<Prompt> {
  await validatePromptTitle(repository, workspace, input.title);

  const title = input.title.trim();
  const now = new Date();
  const existingStableIds = await collectExistingStableIds(repository, workspace);
  const stableId = generateUniqueStableId(existingStableIds);
  const metadata: PromptMetadata = {
    id: stableId,
    title,
    tags: input.tags,
    created: now.toISOString(),
    modified: now.toISOString(),
    copyCount: 0,
    pinned: false,
  };

  const content = serializeMarkdown(input.content, metadata);
  const filename = filenameFromTitle(title);
  const entry = await repository.writeText(workspace, filename, content);

  return {
    id: stableId,
    title,
    content: input.content,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    copyCount: 0,
    pinned: false,
    pinnedAt: undefined,
    filePath: entry.path,
  };
}

/**
 * 更新现有 Prompt
 */
export async function updatePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt,
  updates: UpdatePromptInput,
  options: { createHistory?: boolean } = {}
): Promise<Prompt> {
  if (updates.title !== undefined) {
    await validatePromptTitle(repository, workspace, updates.title, prompt.filePath);
  }

  if (options.createHistory !== false) {
    await createHistoryVersion(repository, workspace, prompt);
  }

  const now = new Date();
  const updatedTitle = updates.title?.trim();
  const updatedPrompt: Prompt = {
    ...prompt,
    ...(updatedTitle !== undefined && { title: updatedTitle }),
    ...(updates.content !== undefined && { content: updates.content }),
    ...(updates.tags !== undefined && { tags: updates.tags }),
    ...(updates.createdAt !== undefined && { createdAt: updates.createdAt }),
    ...(updates.copyCount !== undefined && { copyCount: updates.copyCount }),
    ...(updates.pinned !== undefined && { pinned: updates.pinned }),
    pinnedAt: getNextPinnedAt(prompt, updates.pinned, updates.pinnedAt, now),
    updatedAt: now,
  };

  const metadata: PromptMetadata = {
    ...(hasPersistedStableId(prompt) && { id: prompt.id }),
    title: updatedPrompt.title,
    tags: updatedPrompt.tags,
    created: updatedPrompt.createdAt.toISOString(),
    modified: now.toISOString(),
    copyCount: updatedPrompt.copyCount,
    pinned: updatedPrompt.pinned,
    pinnedAt: updatedPrompt.pinnedAt?.toISOString(),
  };

  const oldFilename = prompt.filePath || filenameFromId(prompt.id);
  const tagStyle = await readPromptTagStyle(repository, workspace, oldFilename);
  const content = serializeMarkdown(updatedPrompt.content, metadata, {
    ...(tagStyle && { tagStyle }),
  });
  const nextFilename = updates.title === undefined
    ? oldFilename
    : pathInSameDirectory(oldFilename, filenameFromTitle(updatedPrompt.title));

  if (oldFilename === nextFilename) {
    await repository.writeText(workspace, oldFilename, content);
  } else {
    await repository.writeText(workspace, oldFilename, content);
    await repository.move(workspace, oldFilename, nextFilename);
  }

  return {
    ...updatedPrompt,
    id: prompt.id,
    filePath: nextFilename,
  };
}

/**
 * 删除 Prompt
 */
export async function deletePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void> {
  const filename = prompt.filePath || filenameFromId(prompt.id);
  const timestamp = formatDateForFile(new Date());
  const trashName = isStableId(prompt.id)
    && !prompt.isTemporaryLegacyId
    ? prompt.id
    : basenameWithoutMarkdownExtension(basenameFromPath(filename));
  const trashFilename = `${trashName}.${timestamp}.md`;

  await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.TRASH_DIR);
  await repository.move(
    workspace,
    filename,
    joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, trashFilename)
  );
}

/**
 * 增加复制计数
 */
export async function incrementCopyCount(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<Prompt> {
  return updatePrompt(repository, workspace, prompt, {
    id: prompt.id,
    copyCount: prompt.copyCount + 1,
  }, { createHistory: false });
}

/**
 * 切换收藏状态
 */
export async function togglePinned(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<Prompt> {
  return updatePrompt(repository, workspace, prompt, {
    id: prompt.id,
    pinned: !prompt.pinned,
  }, { createHistory: false });
}

function getNextPinnedAt(
  prompt: Prompt,
  pinned: boolean | undefined,
  explicitPinnedAt: Date | undefined,
  now: Date
): Date | undefined {
  if (explicitPinnedAt !== undefined) {
    return explicitPinnedAt;
  }

  if (pinned === undefined) {
    return prompt.pinnedAt;
  }

  if (!pinned) {
    return undefined;
  }

  return prompt.pinned ? prompt.pinnedAt : now;
}

/**
 * 创建历史版本
 */
export async function createHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void> {
  if (!hasPersistedStableId(prompt)) {
    console.error(`Cannot create history for non-persisted prompt id: ${prompt.id}`);
    return;
  }

  const config = await FolderConfigService.readFolderConfig(repository, workspace);
  if (!config.historyVersions.enabled) {
    return;
  }

  const filename = prompt.filePath || filenameFromId(prompt.id);

  try {
    await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.HISTORY_DIR);

    const timestamp = formatDateForFile(prompt.updatedAt);
    const historyFilename = `${prompt.id}.${timestamp}.md`;
    const content = await repository.readText(workspace, filename);

    await repository.writeText(
      workspace,
      joinPath(CONFIG.FILE_SYSTEM.HISTORY_DIR, historyFilename),
      content
    );
    await cleanupOldHistoryVersions(repository, workspace, prompt.id);
  } catch (error) {
    console.error('Failed to create history version:', error);
  }
}

export async function validatePromptTitle(
  repository: FileRepository,
  workspace: WorkspaceRef,
  title: string,
  currentFilePath?: string
): Promise<void> {
  const message = validatePromptTitleForFilename(title);
  if (message) {
    throw new Error(message);
  }

  const filename = filenameFromTitle(title);
  const targetFilename = currentFilePath
    ? pathInSameDirectory(currentFilePath, filename)
    : filename;

  if (
    targetFilename !== currentFilePath &&
    await repository.exists(workspace, targetFilename)
  ) {
    throw new Error('标题已存在，请使用不同的标题');
  }
}

/**
 * 清理旧的历史版本
 */
async function cleanupOldHistoryVersions(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<void> {
  const historyFiles = await listHistoryEntries(repository, workspace, promptId);
  const toDelete = historyFiles
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
    .slice(CONFIG.FILE_SYSTEM.MAX_HISTORY_VERSIONS);

  for (const file of toDelete) {
    await repository.remove(workspace, file.path);
  }
}

/**
 * 获取 Prompt 的历史版本列表
 */
export async function getHistoryVersions(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<HistoryVersion[]> {
  const versions = await listHistoryEntries(repository, workspace, promptId);

  return Promise.all(
    versions.map((entry) => loadHistoryVersionFromEntry(repository, workspace, entry))
  ).then((items) =>
    items.sort((a, b) => b.editedAt.getTime() - a.editedAt.getTime())
  );
}

/**
 * 读取指定历史版本
 */
export async function loadHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  filename: string
): Promise<HistoryVersion> {
  if (!isStableId(promptId)) {
    throw new Error('Prompt stable id is invalid');
  }

  const entry = (await listHistoryEntries(repository, workspace, promptId))
    .find((item) => item.name === filename);

  if (!entry) {
    throw new Error('历史版本不存在');
  }

  return loadHistoryVersionFromEntry(repository, workspace, entry);
}

/**
 * 恢复指定历史版本
 */
export async function restoreHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt,
  filename: string
): Promise<Prompt> {
  const version = await loadHistoryVersion(repository, workspace, prompt.id, filename);
  await createHistoryVersion(repository, workspace, prompt);

  return updatePrompt(repository, workspace, prompt, {
    id: prompt.id,
    title: version.title,
    content: version.content,
    tags: version.tags,
    ...(version.createdAt && { createdAt: version.createdAt }),
    copyCount: version.copyCount,
    pinned: version.pinned,
    ...(version.pinnedAt && { pinnedAt: version.pinnedAt }),
  }, { createHistory: false });
}

async function listHistoryEntries(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<FileEntry[]> {
  if (!isStableId(promptId)) {
    return [];
  }

  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
    { includeHiddenDirectories: true }
  );

  return entries.filter((entry) => isHistoryEntryForPrompt(entry, promptId));
}

async function loadHistoryVersionFromEntry(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<HistoryVersion> {
  const parsed = await readPromptFile(repository, workspace, entry);
  return buildHistoryVersionFromParsed(parsed);
}

async function readPromptFile(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<ParsedPromptFile> {
  const raw = await repository.readText(workspace, entry.path);
  const { metadata, content } = parseMarkdown(raw);

  return {
    entry,
    metadata,
    content: content.replace(/^\r?\n/, ''),
    raw,
  };
}

function buildPromptFromParsed(
  parsed: ParsedPromptFile,
  effectiveStableId: string,
  isTemporaryLegacyId = false
): Prompt {
  const { entry, metadata, content, raw } = parsed;
  const fileTitle = idFromFilename(entry.name);
  const tags = metadata.tags && metadata.tags.length > 0
    ? metadata.tags
    : extractFrontmatterBlockTags(raw) ?? [];

  return {
    id: effectiveStableId,
    title: metadata.title || extractTitle(content) || fileTitle,
    content,
    tags,
    createdAt: metadata.created ? new Date(metadata.created) : entry.modifiedAt,
    updatedAt: metadata.modified ? new Date(metadata.modified) : entry.modifiedAt,
    copyCount: metadata.copyCount ?? 0,
    pinned: metadata.pinned ?? false,
    pinnedAt: metadata.pinnedAt ? new Date(metadata.pinnedAt) : undefined,
    filePath: entry.path,
    ...(isTemporaryLegacyId && { isTemporaryLegacyId }),
  };
}

function buildHistoryVersionFromParsed(parsed: ParsedPromptFile): HistoryVersion {
  const { entry, metadata, content, raw } = parsed;
  const tags = metadata.tags && metadata.tags.length > 0
    ? metadata.tags
    : extractFrontmatterBlockTags(raw) ?? [];
  const editedAt = metadata.modified ? new Date(metadata.modified) : entry.modifiedAt;

  return {
    filename: entry.name,
    date: entry.modifiedAt,
    editedAt,
    title: metadata.title || extractTitle(content) || basenameWithoutMarkdownExtension(entry.name),
    content,
    tags,
    createdAt: metadata.created ? new Date(metadata.created) : undefined,
    copyCount: metadata.copyCount ?? 0,
    pinned: metadata.pinned ?? false,
    pinnedAt: metadata.pinnedAt ? new Date(metadata.pinnedAt) : undefined,
  };
}

function assignEffectiveStableIds(parsedFiles: ParsedPromptFile[]): Map<string, string> {
  const assignments = new Map<string, string>();
  const usedStableIds = new Set<string>();
  const validIdGroups = new Map<string, ParsedPromptFile[]>();

  for (const parsed of parsedFiles) {
    if (!isStableId(parsed.metadata.id)) {
      continue;
    }

    const group = validIdGroups.get(parsed.metadata.id) ?? [];
    group.push(parsed);
    validIdGroups.set(parsed.metadata.id, group);
  }

  for (const [stableId, group] of validIdGroups) {
    const canonical = chooseCanonicalDuplicate(group);
    assignments.set(canonical.entry.path, stableId);
    usedStableIds.add(stableId);

    for (const parsed of group) {
      if (parsed === canonical) {
        continue;
      }
      assignments.set(parsed.entry.path, generateUniqueStableId(usedStableIds));
    }
  }

  for (const parsed of parsedFiles) {
    if (assignments.has(parsed.entry.path)) {
      continue;
    }

    assignments.set(parsed.entry.path, generateUniqueStableId(usedStableIds));
  }

  return assignments;
}

function getAssignedStableId(assignments: Map<string, string>, filePath: string): string {
  const stableId = assignments.get(filePath);

  if (!stableId) {
    throw new Error(`Missing assigned stable id for file: ${filePath}`);
  }

  return stableId;
}

function chooseCanonicalDuplicate(group: ParsedPromptFile[]): ParsedPromptFile {
  return [...group].sort(compareDuplicateCandidates)[0];
}

function compareDuplicateCandidates(left: ParsedPromptFile, right: ParsedPromptFile): number {
  const leftTitleMatch = basenameWithoutMarkdownExtension(left.entry.name) === left.metadata.title;
  const rightTitleMatch =
    basenameWithoutMarkdownExtension(right.entry.name) === right.metadata.title;

  if (leftTitleMatch !== rightTitleMatch) {
    return leftTitleMatch ? -1 : 1;
  }

  const modifiedAtDifference = left.entry.modifiedAt.getTime() - right.entry.modifiedAt.getTime();
  if (modifiedAtDifference !== 0) {
    return modifiedAtDifference;
  }

  return left.entry.path.localeCompare(right.entry.path);
}

function basenameWithoutMarkdownExtension(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

function basenameFromPath(path: string): string {
  const lastSeparatorIndex = path.lastIndexOf('/');
  return lastSeparatorIndex === -1 ? path : path.slice(lastSeparatorIndex + 1);
}

async function writePromptFileWithId(
  repository: FileRepository,
  workspace: WorkspaceRef,
  parsed: ParsedPromptFile,
  stableId: string
): Promise<void> {
  const tagStyle = detectFrontmatterTagStyle(parsed.raw);

  await repository.writeText(
    workspace,
    parsed.entry.path,
    serializeMarkdown(parsed.content, {
      ...parsed.metadata,
      id: stableId,
    }, {
      ...(tagStyle && { tagStyle }),
    })
  );
}

async function readPromptTagStyle(
  repository: FileRepository,
  workspace: WorkspaceRef,
  path: string
) {
  try {
    return detectFrontmatterTagStyle(await repository.readText(workspace, path));
  } catch {
    return null;
  }
}

function shouldWritePromptFileWithId(parsed: ParsedPromptFile, stableId: string): boolean {
  return parsed.metadata.id !== stableId || !hasDoubleQuotedStableId(parsed.raw, stableId);
}

function hasDoubleQuotedStableId(content: string, stableId: string): boolean {
  const match = content
    .replace(/^\uFEFF/, '')
    .match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return false;
  }

  return new RegExp(`^\\s*id:\\s*"${stableId}"\\s*$`, 'm').test(match[1]);
}

function hasPersistedStableId(prompt: Prompt): boolean {
  return isStableId(prompt.id) && prompt.isTemporaryLegacyId !== true;
}

async function collectExistingStableIds(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<Set<string>> {
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS]
  );
  const stableIds = new Set<string>();

  for (const entry of entries) {
    try {
      const content = await repository.readText(workspace, entry.path);
      const { metadata } = parseMarkdown(content);
      if (isStableId(metadata.id)) {
        stableIds.add(metadata.id);
      }
    } catch (error) {
      console.error(`Failed to read prompt id for file: ${entry.path}`, error);
    }
  }

  return stableIds;
}

function generateUniqueStableId(usedStableIds: Set<string>): string {
  let stableId = generateStableId();

  while (usedStableIds.has(stableId)) {
    stableId = generateStableId();
  }

  usedStableIds.add(stableId);
  return stableId;
}

function pathInSameDirectory(currentPath: string, filename: string): string {
  const lastSeparatorIndex = currentPath.lastIndexOf('/');

  if (lastSeparatorIndex === -1) {
    return filename;
  }

  return joinPath(currentPath.slice(0, lastSeparatorIndex), filename);
}

function isHistoryEntryForPrompt(entry: FileEntry, stableId: string): boolean {
  if (!isStableId(stableId)) {
    return false;
  }

  if (!entry.path.startsWith(HISTORY_PATH_PREFIX)) {
    return false;
  }

  const escapedPromptId = stableId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filenamePattern = new RegExp(
    `^${escapedPromptId}\\.\\d{4}-\\d{2}-\\d{2}-\\d{6}\\.md$`
  );
  return filenamePattern.test(entry.name);
}

function extractFrontmatterBlockTags(content: string): string[] | null {
  const match = content
    .replace(/^\uFEFF/, '')
    .match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return null;
  }

  const lines = match[1].split(/\r?\n/);
  const tags: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== 'tags:') {
      continue;
    }

    for (let tagIndex = index + 1; tagIndex < lines.length; tagIndex += 1) {
      const line = lines[tagIndex];
      if (!/^\s+-\s+/.test(line)) {
        break;
      }
      const tag = line.replace(/^\s+-\s+/, '').trim();
      if (tag) {
        tags.push(tag);
      }
    }

    return tags;
  }

  return null;
}

/**
 * 导出 PromptService
 */
export const PromptService = {
  loadPrompt,
  loadPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  incrementCopyCount,
  togglePinned,
  validatePromptTitle,
  createHistoryVersion,
  getHistoryVersions,
  loadHistoryVersion,
  restoreHistoryVersion,
} as const;
