import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { generateStableId, isStableId } from '@/utils/id';
import { parseMarkdown } from '@/utils/markdown';
import type { FileRepository } from './fileRepository';

export type IdRepairReason = 'missing' | 'invalid' | 'duplicate';

export interface IdRepairRecord {
  path: string;
  previousId?: string;
  newId: string;
  reason: IdRepairReason;
}

export interface IdRepairFailure {
  path: string;
  reason: IdRepairReason | 'read';
  error: string;
}

export interface WorkspaceIntegrityResult {
  repairs: IdRepairRecord[];
  failures: IdRepairFailure[];
}

export interface WorkspaceIntegrityOptions {
  newlyCreatedPaths?: ReadonlySet<string>;
}

interface PromptFileIdentity {
  entry: FileEntry;
  id?: string;
}

interface PlannedRepair extends IdRepairRecord {
  expectedId?: string;
}

function isUserPromptEntry(entry: FileEntry): boolean {
  const parts = entry.path.split('/');
  return (
    entry.path.toLowerCase().endsWith('.md') &&
    parts[0] !== CONFIG.FILE_SYSTEM.APP_DATA_DIR &&
    !parts.some((part) => part.startsWith('.'))
  );
}

function compareCandidates(
  left: PromptFileIdentity,
  right: PromptFileIdentity,
  newlyCreatedPaths: ReadonlySet<string>
): number {
  const leftIsNew = newlyCreatedPaths.has(left.entry.path);
  const rightIsNew = newlyCreatedPaths.has(right.entry.path);
  if (leftIsNew !== rightIsNew) {
    return leftIsNew ? 1 : -1;
  }

  const modifiedDifference = left.entry.modifiedAt.getTime() - right.entry.modifiedAt.getTime();
  return modifiedDifference || left.entry.path.localeCompare(right.entry.path);
}

function generateUniqueId(usedIds: Set<string>): string {
  let id = generateStableId();
  while (usedIds.has(id)) {
    id = generateStableId();
  }
  usedIds.add(id);
  return id;
}

function planRepairs(
  files: PromptFileIdentity[],
  newlyCreatedPaths: ReadonlySet<string>
): PlannedRepair[] {
  const usedIds = new Set(files.map((file) => file.id).filter(isStableId));
  const groups = new Map<string, PromptFileIdentity[]>();
  const repairs: PlannedRepair[] = [];

  for (const file of files) {
    if (!isStableId(file.id)) continue;
    const group = groups.get(file.id) ?? [];
    group.push(file);
    groups.set(file.id, group);
  }

  for (const [id, group] of groups) {
    const sorted = [...group].sort((left, right) =>
      compareCandidates(left, right, newlyCreatedPaths)
    );
    for (const duplicate of sorted.slice(1)) {
      repairs.push({
        path: duplicate.entry.path,
        previousId: id,
        expectedId: id,
        newId: generateUniqueId(usedIds),
        reason: 'duplicate',
      });
    }
  }

  for (const file of files) {
    if (isStableId(file.id)) continue;
    repairs.push({
      path: file.entry.path,
      ...(file.id ? { previousId: file.id, expectedId: file.id } : {}),
      newId: generateUniqueId(usedIds),
      reason: file.id ? 'invalid' : 'missing',
    });
  }

  return repairs;
}

function patchPromptId(raw: string, id: string): string {
  const frontmatter = raw.match(/^(\uFEFF)?---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return `---\nid: "${id}"\n---\n\n${raw}`;
  }

  const body = frontmatter[2];
  const patchedBody = /^\s*id\s*:/m.test(body)
    ? body.replace(/^\s*id\s*:.*$/m, `id: "${id}"`)
    : `${body}\nid: "${id}"`;
  return raw.replace(frontmatter[0], frontmatter[0].replace(body, patchedBody));
}

export async function repairPromptIds(
  repository: FileRepository,
  workspace: WorkspaceRef,
  options: WorkspaceIntegrityOptions = {}
): Promise<WorkspaceIntegrityResult> {
  const entries = (await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS]
  )).filter(isUserPromptEntry);
  const files: PromptFileIdentity[] = [];
  const failures: IdRepairFailure[] = [];

  for (const entry of entries) {
    try {
      const raw = await repository.readText(workspace, entry.path);
      files.push({ entry, id: parseMarkdown(raw).metadata.id });
    } catch (error) {
      failures.push({
        path: entry.path,
        reason: 'read',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const planned = planRepairs(files, options.newlyCreatedPaths ?? new Set());
  const repairs: IdRepairRecord[] = [];

  for (const repair of planned) {
    try {
      const currentRaw = await repository.readText(workspace, repair.path);
      const currentId = parseMarkdown(currentRaw).metadata.id;
      if (currentId !== repair.expectedId) {
        throw new Error('文件在 ID 修复前已被外部修改');
      }
      await repository.writeText(workspace, repair.path, patchPromptId(currentRaw, repair.newId));
      repairs.push({
        path: repair.path,
        ...(repair.previousId ? { previousId: repair.previousId } : {}),
        newId: repair.newId,
        reason: repair.reason,
      });
    } catch (error) {
      failures.push({
        path: repair.path,
        reason: repair.reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { repairs, failures };
}

export const WorkspaceIntegrityService = { repairPromptIds } as const;
