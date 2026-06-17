/**
 * 回收站服务
 *
 * 处理被删除 Prompt 的加载、恢复、永久删除、清空。
 *
 * 核心约束：trashBase 的前缀可能是 stableId（17 位数字）也可能是 legacy
 * basename（标题派生），无法可靠反推原始 prompt id。因此恢复流程为：
 *   1. move md 文件到目标位置
 *   2. 触发 stableId 分配（写入新 stableId）
 *   3. 用新的 stableId move 批注 / 附件
 */

import type { FileEntry, WorkspaceRef } from '@/types/file';
import type { DeletedPrompt, Prompt } from '@/types/prompt';
import type { FileRepository } from './fileRepository';
import { loadPrompts } from './promptService';
import { CONFIG } from '@/constants/config';
import { joinPath } from '@/utils/path';
import {
  filenameFromTitle,
  validatePromptTitleForFilename,
} from '@/utils/id';
import { getPromptPreview, parseFrontmatterOnly } from '@/utils/markdown';

const TIMESTAMP_PATTERN = /\.(\d{4})-(\d{2})-(\d{2})-(\d{6})$/;
const MAX_RESTORE_ATTEMPTS = 100;
const DEFAULT_RESTORE_SUFFIX = (counter: number) => `-restored-${counter}`;

export interface RestorePromptOptions {
  /**
   * 文件名冲突时追加的后缀生成器。counter 从 1 开始。
   * 默认 `(n) => '-restored-${n}'`。
   */
  buildRestoreSuffix?: (counter: number) => string;
}

/**
 * 加载回收站内所有被删除的 Prompt。
 *
 * 扫描 _promptclip/.trash/ 根目录下的 .md 文件，解析 frontmatter 与
 * 文件名时间戳，并探测是否有关联批注 JSON。
 */
export async function loadDeletedPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<DeletedPrompt[]> {
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
    { includeHiddenDirectories: true }
  );

  const trashPrefix = `${CONFIG.FILE_SYSTEM.TRASH_DIR}/`;
  const trashEntries = entries.filter((entry) => {
    if (!entry.path.startsWith(trashPrefix)) return false;
    const relToTrash = entry.path.slice(trashPrefix.length);
    // 排除 .trash/annotations/ 和 .trash/assets/ 下的非 Prompt 文件
    return !relToTrash.startsWith('annotations/') && !relToTrash.startsWith('assets/');
  });

  const items = await Promise.all(
    trashEntries.map((entry) => parseDeletedEntry(repository, workspace, entry))
  );

  return items
    .filter((item): item is DeletedPrompt => item !== null)
    .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

async function parseDeletedEntry(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<DeletedPrompt | null> {
  const trashBase = entry.name.replace(/\.md$/i, '');
  const deletedAt = parseDeletedAt(trashBase);
  if (!deletedAt) return null;

  let title = trashBase;
  let preview = '';
  try {
    const raw = await repository.readText(workspace, entry.path);
    const { metadata, body } = parseFrontmatterOnly(raw);
    title = metadata.title || trashBase;
    preview = getPromptPreview(body).text;
  } catch (error) {
    console.error(`Failed to read deleted prompt: ${entry.path}`, error);
  }

  const annotationPath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR,
    'annotations',
    `${trashBase}.json`
  );
  const hasAnnotations = await repository.exists(workspace, annotationPath);

  return {
    trashBase,
    filePath: entry.path,
    title,
    preview,
    deletedAt,
    hasAnnotations,
  };
}

function parseDeletedAt(trashBase: string): Date | null {
  const match = trashBase.match(TIMESTAMP_PATTERN);
  if (!match) return null;

  const [, year, month, day, hms] = match;
  const hh = hms.slice(0, 2);
  const mi = hms.slice(2, 4);
  const ss = hms.slice(4, 6);
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hh),
    Number(mi),
    Number(ss)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 恢复被删除的 Prompt 及其关联批注、附件。
 *
 * 流程：
 *   1. 生成目标文件名（含冲突处理）
 *   2. move md 文件
 *   3. 重新加载 prompts，触发 stableId 分配（loadPrompts 内部会写回）
 *   4. 用新 stableId move 批注 / 附件
 *
 * 部分失败策略：步骤 4 失败时，md 已恢复，批注/附件仍在 trash，由调用方提示用户。
 */
export async function restorePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt,
  options?: RestorePromptOptions
): Promise<Prompt> {
  const buildSuffix = options?.buildRestoreSuffix ?? DEFAULT_RESTORE_SUFFIX;
  const targetFilename = await generateTargetFilename(
    repository,
    workspace,
    deleted.title,
    buildSuffix
  );

  // 1. move md 文件
  await repository.move(workspace, deleted.filePath, targetFilename);

  // 2. 重新加载，触发 stableId 分配（loadPrompts 会给 legacy 文件写新 stableId）
  const allPrompts = await loadPrompts(repository, workspace);
  const restored = allPrompts.find((p) => p.filePath === targetFilename);
  if (!restored) {
    throw new Error('恢复后未找到目标 Prompt');
  }

  // 3. 用新 stableId move 批注和附件
  await restoreAnnotations(repository, workspace, deleted, restored.id);
  await restoreAnnotationAssets(repository, workspace, deleted, restored.id);

  return restored;
}

async function generateTargetFilename(
  repository: FileRepository,
  workspace: WorkspaceRef,
  title: string,
  buildSuffix: (counter: number) => string
): Promise<string> {
  const validateError = validatePromptTitleForFilename(title);
  if (validateError) {
    throw new Error(validateError);
  }

  for (let counter = 0; counter < MAX_RESTORE_ATTEMPTS; counter++) {
    const candidate = counter === 0 ? title : `${title}${buildSuffix(counter)}`;
    const filename = filenameFromTitle(candidate);
    if (!(await repository.exists(workspace, filename))) {
      return filename;
    }
  }

  throw new Error('无法生成可用文件名（冲突过多）');
}

async function restoreAnnotations(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt,
  newPromptId: string
): Promise<void> {
  const sourcePath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR,
    'annotations',
    `${deleted.trashBase}.json`
  );

  if (!(await repository.exists(workspace, sourcePath))) {
    return;
  }

  await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR);
  await repository.move(
    workspace,
    sourcePath,
    joinPath(CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR, `${newPromptId}.json`)
  );
}

async function restoreAnnotationAssets(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt,
  newPromptId: string
): Promise<void> {
  const sourcePath = joinPath(
    CONFIG.FILE_SYSTEM.TRASH_DIR,
    'assets',
    deleted.trashBase
  );

  if (!(await repository.exists(workspace, sourcePath))) {
    return;
  }

  await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR);
  await repository.move(
    workspace,
    sourcePath,
    joinPath(CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR, newPromptId)
  );
}

/**
 * 永久删除单个被删除的 Prompt 及其关联批注与附件。
 */
export async function permanentDelete(
  repository: FileRepository,
  workspace: WorkspaceRef,
  deleted: DeletedPrompt
): Promise<void> {
  await repository.remove(workspace, deleted.filePath);

  await removeIfExists(
    repository,
    workspace,
    joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'annotations', `${deleted.trashBase}.json`)
  );
  await removeIfExists(
    repository,
    workspace,
    joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'assets', deleted.trashBase)
  );
}

/**
 * 清空回收站。
 *
 * 串行执行以避免 File System Access API 在同一目录下的并发竞争。
 * 单项失败不中断后续删除，最终抛出聚合错误。
 */
export async function emptyRecycleBin(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<void> {
  const items = await loadDeletedPrompts(repository, workspace);

  const failures: { trashBase: string; error: Error }[] = [];
  for (const item of items) {
    try {
      await permanentDelete(repository, workspace, item);
    } catch (error) {
      failures.push({
        trashBase: item.trashBase,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      console.error('Failed to permanently delete:', item.trashBase, error);
    }
  }

  if (failures.length > 0) {
    throw new Error(`部分文件删除失败（${failures.length}/${items.length}）`);
  }
}

async function removeIfExists(
  repository: FileRepository,
  workspace: WorkspaceRef,
  path: string
): Promise<void> {
  if (await repository.exists(workspace, path)) {
    await repository.remove(workspace, path);
  }
}

export const RecycleService = {
  loadDeletedPrompts,
  restorePrompt,
  permanentDelete,
  emptyRecycleBin,
} as const;
