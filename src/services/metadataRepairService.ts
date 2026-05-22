/**
 * Prompt 元数据维护服务
 *
 * 扫描并补全 Obsidian 等外部工具创建的 Markdown 文件所缺少的 PromptClip 元数据。
 */

import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import type { PromptMetadata } from '@/types/prompt';
import { extractTitle, parseMarkdown, serializeMarkdown } from '@/utils/markdown';
import { generateStableId, isStableId } from '@/utils/id';
import type { FileRepository } from './fileRepository';

export type PromptMetadataField =
  | 'id'
  | 'title'
  | 'tags'
  | 'created'
  | 'modified'
  | 'copy_count'
  | 'pinned';

export interface PromptMetadataIssue {
  path: string;
  title: string;
  missingFields: PromptMetadataField[];
  invalidFields: PromptMetadataField[];
}

export interface PromptMetadataScanResult {
  totalMarkdownFiles: number;
  healthyFiles: number;
  repairableFiles: number;
  issues: PromptMetadataIssue[];
}

export interface PromptMetadataRepairResult extends PromptMetadataScanResult {
  repairedFiles: number;
}

interface AnalyzedPromptFile {
  entry: FileEntry;
  raw: string;
  metadata: PromptMetadata;
  content: string;
  issue: PromptMetadataIssue | null;
}

const REQUIRED_FIELDS: PromptMetadataField[] = [
  'id',
  'title',
  'tags',
  'created',
  'modified',
  'copy_count',
  'pinned',
];

/**
 * 扫描当前工作区中需要补全 PromptClip metadata 的 Markdown 文件。
 */
export async function scanPromptMetadata(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<PromptMetadataScanResult> {
  const files = await readAnalyzedPromptFiles(repository, workspace);
  return buildScanResult(files);
}

/**
 * 修复当前工作区中缺失或无效的 PromptClip metadata。
 */
export async function repairPromptMetadata(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<PromptMetadataRepairResult> {
  const files = await readAnalyzedPromptFiles(repository, workspace);
  const usedStableIds = collectUsedStableIds(files);
  let repairedFiles = 0;

  for (const file of files) {
    if (!file.issue) {
      continue;
    }

    const repaired = repairPromptFile(file, usedStableIds);
    await repository.writeText(workspace, file.entry.path, repaired);
    repairedFiles += 1;
  }

  return {
    ...buildScanResult(files),
    repairedFiles,
  };
}

async function readAnalyzedPromptFiles(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<AnalyzedPromptFile[]> {
  const entries = await repository.listFiles(
    workspace,
    [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS]
  );
  const files: AnalyzedPromptFile[] = [];

  for (const entry of entries) {
    const raw = await repository.readText(workspace, entry.path);
    const parsed = parseMarkdown(raw);
    files.push({
      entry,
      raw,
      metadata: parsed.metadata,
      content: parsed.content,
      issue: analyzePromptFile(entry, raw, parsed.metadata, parsed.content),
    });
  }

  return files;
}

function analyzePromptFile(
  entry: FileEntry,
  raw: string,
  metadata: PromptMetadata,
  content: string
): PromptMetadataIssue | null {
  const missingFields: PromptMetadataField[] = [];
  const invalidFields: PromptMetadataField[] = [];

  if (!hasFrontmatterKey(raw, 'id')) {
    missingFields.push('id');
  } else if (!isStableId(metadata.id)) {
    invalidFields.push('id');
  }

  if (!hasFrontmatterKey(raw, 'title')) {
    missingFields.push('title');
  } else if (!metadata.title?.trim()) {
    invalidFields.push('title');
  }

  if (!hasFrontmatterKey(raw, 'tags')) {
    missingFields.push('tags');
  }

  if (!hasFrontmatterKey(raw, 'created')) {
    missingFields.push('created');
  } else if (!isValidDateString(metadata.created)) {
    invalidFields.push('created');
  }

  if (!hasFrontmatterKey(raw, 'modified')) {
    missingFields.push('modified');
  } else if (!isValidDateString(metadata.modified)) {
    invalidFields.push('modified');
  }

  if (!hasFrontmatterKey(raw, 'copy_count') && !hasFrontmatterKey(raw, 'copyCount')) {
    missingFields.push('copy_count');
  } else if (metadata.copyCount === undefined) {
    invalidFields.push('copy_count');
  }

  if (!hasFrontmatterKey(raw, 'pinned')) {
    missingFields.push('pinned');
  } else if (metadata.pinned === undefined) {
    invalidFields.push('pinned');
  }

  if (missingFields.length === 0 && invalidFields.length === 0) {
    return null;
  }

  return {
    path: entry.path,
    title: getDefaultTitle(entry, content),
    missingFields,
    invalidFields,
  };
}

function buildScanResult(files: AnalyzedPromptFile[]): PromptMetadataScanResult {
  const issues = files
    .map((file) => file.issue)
    .filter((issue): issue is PromptMetadataIssue => issue !== null);

  return {
    totalMarkdownFiles: files.length,
    healthyFiles: files.length - issues.length,
    repairableFiles: issues.length,
    issues,
  };
}

function collectUsedStableIds(files: AnalyzedPromptFile[]): Set<string> {
  const stableIds = new Set<string>();

  for (const file of files) {
    if (isStableId(file.metadata.id)) {
      stableIds.add(file.metadata.id);
    }
  }

  return stableIds;
}

function repairPromptFile(file: AnalyzedPromptFile, usedStableIds: Set<string>): string {
  const missingFields = new Set(file.issue?.missingFields ?? []);
  const invalidFields = new Set(file.issue?.invalidFields ?? []);
  const updates = buildMetadataUpdates(file, missingFields, invalidFields, usedStableIds);

  if (!hasFrontmatter(file.raw)) {
    return serializeMarkdown(file.raw, updates);
  }

  return patchFrontmatter(file.raw, updates, invalidFields);
}

function buildMetadataUpdates(
  file: AnalyzedPromptFile,
  missingFields: Set<PromptMetadataField>,
  invalidFields: Set<PromptMetadataField>,
  usedStableIds: Set<string>
): Required<Pick<PromptMetadata, 'title' | 'tags' | 'created' | 'modified' | 'copyCount' | 'pinned'>>
  & Pick<PromptMetadata, 'id'> {
  const metadata = file.metadata;
  const fallbackDate = file.entry.modifiedAt.toISOString();

  return {
    id: getRepairStableId(metadata.id, missingFields, invalidFields, usedStableIds),
    title: metadata.title?.trim() || getDefaultTitle(file.entry, file.content),
    tags: metadata.tags ?? [],
    created: isValidDateString(metadata.created) ? metadata.created : fallbackDate,
    modified: isValidDateString(metadata.modified) ? metadata.modified : fallbackDate,
    copyCount: metadata.copyCount ?? 0,
    pinned: metadata.pinned ?? false,
  };
}

function getRepairStableId(
  currentId: string | undefined,
  missingFields: Set<PromptMetadataField>,
  invalidFields: Set<PromptMetadataField>,
  usedStableIds: Set<string>
): string | undefined {
  if (!missingFields.has('id') && !invalidFields.has('id')) {
    return currentId;
  }

  let stableId = generateStableId();
  while (usedStableIds.has(stableId)) {
    stableId = generateStableId();
  }
  usedStableIds.add(stableId);
  return stableId;
}

function patchFrontmatter(
  raw: string,
  metadata: PromptMetadata,
  invalidFields: Set<PromptMetadataField>
): string {
  const match = getFrontmatterMatch(raw);
  if (!match) {
    return serializeMarkdown(raw, metadata);
  }

  const frontmatterStart = match[0].startsWith('\uFEFF') ? '\uFEFF---\n' : '---\n';
  const suffix = raw.slice(match[0].length);
  let body = match[1];
  const linesToAppend = buildMissingMetadataLines(raw, metadata);

  body = replaceInvalidMetadataLines(body, metadata, invalidFields);

  if (linesToAppend.length > 0) {
    body = body.trimEnd();
    body = body ? `${body}\n${linesToAppend.join('\n')}` : linesToAppend.join('\n');
  }

  return `${frontmatterStart}${body}\n---\n${suffix}`;
}

function replaceInvalidMetadataLines(
  frontmatterBody: string,
  metadata: PromptMetadata,
  invalidFields: Set<PromptMetadataField>
): string {
  let nextBody = frontmatterBody;

  for (const field of invalidFields) {
    const key = field === 'copy_count' ? getCopyCountKey(frontmatterBody) : field;
    const value = metadataValueForField(metadata, field);
    if (value === undefined) {
      continue;
    }
    nextBody = replaceFrontmatterLine(nextBody, key, `${key}: ${stringifyYamlValue(value)}`);
  }

  return nextBody;
}

function buildMissingMetadataLines(raw: string, metadata: PromptMetadata): string[] {
  const lines: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (hasPromptField(raw, field)) {
      continue;
    }

    const value = metadataValueForField(metadata, field);
    if (value === undefined) {
      continue;
    }
    lines.push(`${field}: ${stringifyYamlValue(value)}`);
  }

  return lines;
}

function metadataValueForField(metadata: PromptMetadata, field: PromptMetadataField): unknown {
  switch (field) {
    case 'id':
      return metadata.id;
    case 'title':
      return metadata.title;
    case 'tags':
      return metadata.tags ?? [];
    case 'created':
      return metadata.created;
    case 'modified':
      return metadata.modified;
    case 'copy_count':
      return metadata.copyCount ?? 0;
    case 'pinned':
      return metadata.pinned ?? false;
  }
}

function hasPromptField(raw: string, field: PromptMetadataField): boolean {
  if (field === 'copy_count') {
    return hasFrontmatterKey(raw, 'copy_count') || hasFrontmatterKey(raw, 'copyCount');
  }

  return hasFrontmatterKey(raw, field);
}

function hasFrontmatter(raw: string): boolean {
  return getFrontmatterMatch(raw) !== null;
}

function hasFrontmatterKey(raw: string, key: string): boolean {
  const match = getFrontmatterMatch(raw);
  if (!match) {
    return false;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escapedKey}:`, 'm').test(match[1]);
}

function getFrontmatterMatch(raw: string): RegExpMatchArray | null {
  return raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
}

function replaceFrontmatterLine(body: string, key: string, replacement: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return body.replace(new RegExp(`^\\s*${escapedKey}:.*$`, 'm'), replacement);
}

function getCopyCountKey(body: string): string {
  return /^\s*copyCount:/m.test(body) ? 'copyCount' : 'copy_count';
}

function isValidDateString(value: string | undefined): value is string {
  return value !== undefined && !Number.isNaN(new Date(value).getTime());
}

function getDefaultTitle(entry: FileEntry, content: string): string {
  return extractTitle(content) || basenameWithoutMarkdownExtension(entry.name);
}

function basenameWithoutMarkdownExtension(filename: string): string {
  return filename.replace(/\.md$/i, '');
}

function stringifyYamlValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyYamlValue(String(item))).join(', ')}]`;
  }

  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  return String(value);
}

export const MetadataRepairService = {
  scanPromptMetadata,
  repairPromptMetadata,
} as const;
