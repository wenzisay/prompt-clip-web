/**
 * Prompt CRUD 服务
 *
 * 处理 Prompt 的创建、读取、更新、删除操作
 */

import type { Prompt, CreatePromptInput, UpdatePromptInput, PromptMetadata } from '@/types/prompt';
import {
  filenameFromId,
  filenameFromTitle,
  formatDateForFile,
  idFromFilename,
  validatePromptTitleForFilename,
} from '@/utils/id';
import { FileService } from './fileService';
import { parseMarkdown, serializeMarkdown, extractTitle } from '@/utils/markdown';
import { CONFIG } from '@/constants/config';

/**
 * 从文件加载 Prompt
 */
export async function loadPrompt(fileHandle: FileSystemFileHandle): Promise<Prompt> {
  const content = await FileService.readFile(fileHandle);
  const { metadata, content: markdownContent } = parseMarkdown(content);
  const fileTitle = idFromFilename(fileHandle.name);

  return {
    id: fileTitle,
    title: metadata.title || extractTitle(markdownContent) || fileTitle,
    content: markdownContent,
    tags: metadata.tags || [],
    createdAt: metadata.created ? new Date(metadata.created) : await FileService.getFileModTime(fileHandle),
    updatedAt: metadata.modified ? new Date(metadata.modified) : await FileService.getFileModTime(fileHandle),
    copyCount: metadata.copyCount || 0,
    pinned: metadata.pinned || false,
    fileHandle,
  };
}

/**
 * 加载目录中的所有 Prompts
 */
export async function loadPrompts(
  directoryHandle: FileSystemDirectoryHandle
): Promise<Prompt[]> {
  const fileHandles = await FileService.listFiles(directoryHandle);
  const prompts: Prompt[] = [];

  for (const fileHandle of fileHandles) {
    try {
      const prompt = await loadPrompt(fileHandle);
      prompts.push(prompt);
    } catch (error) {
      console.error(`Failed to load prompt: ${fileHandle.name}`, error);
    }
  }

  // 按修改时间排序
  return prompts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * 创建新 Prompt
 */
export async function createPrompt(
  directoryHandle: FileSystemDirectoryHandle,
  input: CreatePromptInput
): Promise<Prompt> {
  await validatePromptTitle(directoryHandle, input.title);

  const title = input.title.trim();
  const id = title;
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

  await FileService.writeFile(directoryHandle, filename, content);

  // 获取文件句柄
  const fileHandle = await directoryHandle.getFileHandle(filename);

  return {
    id,
    title,
    content: input.content,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
    copyCount: 0,
    pinned: false,
    fileHandle,
  };
}

/**
 * 更新现有 Prompt
 */
export async function updatePrompt(
  directoryHandle: FileSystemDirectoryHandle,
  prompt: Prompt,
  updates: UpdatePromptInput,
  options: { createHistory?: boolean } = {}
): Promise<Prompt> {
  if (updates.title !== undefined) {
    await validatePromptTitle(directoryHandle, updates.title, prompt.id);
  }

  if (options.createHistory !== false) {
    await createHistoryVersion(directoryHandle, prompt);
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
  const oldFilename = prompt.fileHandle?.name || filenameFromId(prompt.id);
  const nextFilename = filenameFromTitle(updatedPrompt.title);

  const fileHandle = await FileService.writeFile(directoryHandle, nextFilename, content);

  if (oldFilename !== nextFilename && await FileService.fileExists(directoryHandle, oldFilename)) {
    await FileService.deleteFile(directoryHandle, oldFilename);
  }

  return {
    ...updatedPrompt,
    id: idFromFilename(nextFilename),
    fileHandle,
  };
}

/**
 * 删除 Prompt
 */
export async function deletePrompt(
  directoryHandle: FileSystemDirectoryHandle,
  prompt: Prompt
): Promise<void> {
  const filename = prompt.fileHandle?.name || filenameFromId(prompt.id);
  const timestamp = formatDateForFile(new Date());
  const trashFilename = `${idFromFilename(filename)}.${timestamp}.md`;

  // 先移到回收站
  try {
    await FileService.createDirectory(directoryHandle, CONFIG.FILE_SYSTEM.TRASH_DIR);
  } catch {
    // 目录可能已存在
  }

  await FileService.moveFile(
    directoryHandle,
    filename,
    `${CONFIG.FILE_SYSTEM.TRASH_DIR}/${trashFilename}`
  );
}

/**
 * 增加复制计数
 */
export async function incrementCopyCount(
  directoryHandle: FileSystemDirectoryHandle,
  prompt: Prompt
): Promise<Prompt> {
  return updatePrompt(directoryHandle, prompt, {
    id: prompt.id,
    copyCount: prompt.copyCount + 1,
  }, { createHistory: false });
}

/**
 * 切换收藏状态
 */
export async function togglePinned(
  directoryHandle: FileSystemDirectoryHandle,
  prompt: Prompt
): Promise<Prompt> {
  return updatePrompt(directoryHandle, prompt, {
    id: prompt.id,
    pinned: !prompt.pinned,
  }, { createHistory: false });
}

/**
 * 创建历史版本
 */
export async function createHistoryVersion(
  directoryHandle: FileSystemDirectoryHandle,
  prompt: Prompt
): Promise<void> {
  // 如果没有文件句柄，跳过
  if (!prompt.fileHandle) return;

  try {
    // 创建历史目录
    await FileService.createDirectory(directoryHandle, CONFIG.FILE_SYSTEM.HISTORY_DIR);

    const historyDir = await directoryHandle.getDirectoryHandle(CONFIG.FILE_SYSTEM.HISTORY_DIR);
    const timestamp = formatDateForFile(prompt.updatedAt);
    const historyFilename = `${prompt.id}.${timestamp}.md`;

    // 读取当前内容
    const content = await FileService.readFile(prompt.fileHandle);

    // 写入历史版本
    await FileService.writeFile(historyDir, historyFilename, content);

    // 清理旧的历史版本
    await cleanupOldHistoryVersions(historyDir, prompt.id);
  } catch (error) {
    console.error('Failed to create history version:', error);
  }
}

export async function validatePromptTitle(
  directoryHandle: FileSystemDirectoryHandle,
  title: string,
  currentPromptId?: string
): Promise<void> {
  const message = validatePromptTitleForFilename(title);
  if (message) {
    throw new Error(message);
  }

  const filename = filenameFromTitle(title);
  const currentFilename = currentPromptId ? filenameFromId(currentPromptId) : null;

  if (filename !== currentFilename && await FileService.fileExists(directoryHandle, filename)) {
    throw new Error('标题已存在，请使用不同的标题');
  }
}

/**
 * 清理旧的历史版本
 */
async function cleanupOldHistoryVersions(
  historyDir: FileSystemDirectoryHandle,
  promptId: string
): Promise<void> {
  const historyFiles: { name: string; handle: FileSystemFileHandle; time: number }[] = [];

  // 找出该 prompt 的所有历史版本
  for await (const entry of historyDir.values()) {
    if (entry.kind === 'file' && entry.name.startsWith(promptId)) {
      const handle = entry as FileSystemFileHandle;
      const file = await handle.getFile();
      historyFiles.push({
        name: entry.name,
        handle,
        time: file.lastModified,
      });
    }
  }

  // 按时间排序，删除超出限制的旧版本
  historyFiles.sort((a, b) => b.time - a.time);
  const toDelete = historyFiles.slice(CONFIG.FILE_SYSTEM.MAX_HISTORY_VERSIONS);

  for (const file of toDelete) {
    await historyDir.removeEntry(file.name);
  }
}

/**
 * 获取 Prompt 的历史版本列表
 */
export async function getHistoryVersions(
  directoryHandle: FileSystemDirectoryHandle,
  promptId: string
): Promise<Array<{ filename: string; date: Date }>> {
  try {
    const historyDir = await directoryHandle.getDirectoryHandle(CONFIG.FILE_SYSTEM.HISTORY_DIR);
    const versions: Array<{ filename: string; date: Date }> = [];

    for await (const entry of historyDir.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(promptId)) {
        const handle = entry as FileSystemFileHandle;
        const file = await handle.getFile();
        versions.push({
          filename: entry.name,
          date: new Date(file.lastModified),
        });
      }
    }

    return versions.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
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
