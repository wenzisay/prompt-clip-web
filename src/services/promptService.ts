/**
 * Prompt CRUD 服务
 *
 * 处理 Prompt 的创建、读取、更新、删除操作
 */

import type { FileEntry, WorkspaceRef } from '@/types/file';
import type { Prompt, CreatePromptInput, UpdatePromptInput, PromptMetadata } from '@/types/prompt';
import type { FileRepository } from './fileRepository';
import {
  filenameFromId,
  filenameFromTitle,
  formatDateForFile,
  idFromFilename,
  validatePromptTitleForFilename,
} from '@/utils/id';
import { joinPath } from '@/utils/path';
import { parseMarkdown, serializeMarkdown, extractTitle } from '@/utils/markdown';
import { CONFIG } from '@/constants/config';

const HISTORY_PATH_PREFIX = `${CONFIG.FILE_SYSTEM.HISTORY_DIR}/`;

/**
 * 从文件加载 Prompt
 */
export async function loadPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<Prompt> {
  const content = await repository.readText(workspace, entry.path);
  const { metadata, content: markdownContent } = parseMarkdown(content);
  const promptContent = markdownContent.replace(/^\r?\n/, '');
  const id = idFromFilename(entry.path);
  const fileTitle = idFromFilename(entry.name);
  const tags = metadata.tags && metadata.tags.length > 0
    ? metadata.tags
    : extractFrontmatterBlockTags(content) ?? [];

  return {
    id,
    title: metadata.title || extractTitle(promptContent) || fileTitle,
    content: promptContent,
    tags,
    createdAt: metadata.created ? new Date(metadata.created) : entry.modifiedAt,
    updatedAt: metadata.modified ? new Date(metadata.modified) : entry.modifiedAt,
    copyCount: metadata.copyCount ?? 0,
    pinned: metadata.pinned ?? false,
    filePath: entry.path,
  };
}

/**
 * 加载目录中的所有 Prompts
 */
export async function loadPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<Prompt[]> {
  const entries = await repository.listFiles(workspace, [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS]);
  const prompts: Prompt[] = [];

  for (const entry of entries) {
    try {
      const prompt = await loadPrompt(repository, workspace, entry);
      prompts.push(prompt);
    } catch (error) {
      console.error(`Failed to load prompt: ${entry.path}`, error);
    }
  }

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
  const metadata: PromptMetadata = {
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
    id: idFromFilename(entry.path),
    title,
    content: input.content,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    copyCount: 0,
    pinned: false,
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
    await validatePromptTitle(repository, workspace, updates.title, prompt.id);
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
    ...(updates.copyCount !== undefined && { copyCount: updates.copyCount }),
    ...(updates.pinned !== undefined && { pinned: updates.pinned }),
    updatedAt: now,
  };

  const metadata: PromptMetadata = {
    title: updatedPrompt.title,
    tags: updatedPrompt.tags,
    created: updatedPrompt.createdAt.toISOString(),
    modified: now.toISOString(),
    copyCount: updatedPrompt.copyCount,
    pinned: updatedPrompt.pinned,
  };

  const content = serializeMarkdown(updatedPrompt.content, metadata);
  const oldFilename = prompt.filePath || filenameFromId(prompt.id);
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
    id: idFromFilename(nextFilename),
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
  const trashFilename = `${idFromFilename(filename)}.${timestamp}.md`;

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

/**
 * 创建历史版本
 */
export async function createHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void> {
  const filename = prompt.filePath || filenameFromId(prompt.id);

  try {
    await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.HISTORY_DIR);

    const timestamp = formatDateForFile(prompt.updatedAt);
    const historyFilename = `${encodeHistoryPromptId(prompt.id)}.${timestamp}.md`;
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
  currentPromptId?: string
): Promise<void> {
  const message = validatePromptTitleForFilename(title);
  if (message) {
    throw new Error(message);
  }

  const filename = filenameFromTitle(title);
  const currentFilename = currentPromptId ? filenameFromId(currentPromptId) : null;
  const targetFilename = currentFilename
    ? pathInSameDirectory(currentFilename, filename)
    : filename;

  if (
    targetFilename !== currentFilename &&
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
): Promise<Array<{ filename: string; date: Date }>> {
  const versions = await listHistoryEntries(repository, workspace, promptId);

  return versions
    .map((entry) => ({
      filename: entry.name,
      date: entry.modifiedAt,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

async function listHistoryEntries(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<FileEntry[]> {
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
    { includeHiddenDirectories: true }
  );

  const encodedPromptId = encodeHistoryPromptId(promptId);
  return entries.filter((entry) => isHistoryEntryForPrompt(entry, encodedPromptId));
}

function pathInSameDirectory(currentPath: string, filename: string): string {
  const lastSeparatorIndex = currentPath.lastIndexOf('/');

  if (lastSeparatorIndex === -1) {
    return filename;
  }

  return joinPath(currentPath.slice(0, lastSeparatorIndex), filename);
}

function encodeHistoryPromptId(promptId: string): string {
  return encodeURIComponent(promptId).replace(/\./g, '%2E');
}

function isHistoryEntryForPrompt(entry: FileEntry, encodedPromptId: string): boolean {
  if (!entry.path.startsWith(HISTORY_PATH_PREFIX)) {
    return false;
  }

  const escapedPromptId = encodedPromptId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
} as const;
