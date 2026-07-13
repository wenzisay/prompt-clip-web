import { CONFIG } from '@/constants/config';
import type { FileRepository } from '@/services/fileRepository';
import type { WorkspaceRef } from '@/types/file';
import { assertSafeRelativePath } from '@/utils/path';
import { sha256 } from './hash';
import {
  BackupError,
  type BackupManifest,
  type BackupManifestFile,
  type BackupHashCache,
  type BackupResult,
  type BackupTarget,
  type RestoreOptions,
  type RestoreResult,
} from './types';

const MANIFEST_PATH = '.promptclip-backup.json';
const TEXT_EXTENSIONS = ['.json', '.md', '.txt', '.yaml', '.yml'];

async function listWorkspaceFiles(
  repository: FileRepository,
  workspace: WorkspaceRef
) {
  return repository.listFiles(workspace, [''], { includeHiddenDirectories: true });
}

async function buildManifestFiles(
  repository: FileRepository,
  workspace: WorkspaceRef,
  cache?: BackupHashCache
): Promise<{ files: Record<string, BackupManifestFile>; contents: Map<string, Uint8Array> }> {
  const entries = await listWorkspaceFiles(repository, workspace);
  const cachedEntries = new Map((await cache?.load() ?? []).map((entry) => [entry.path, entry]));
  const files: Record<string, BackupManifestFile> = {};
  const contents = new Map<string, Uint8Array>();

  for (const entry of entries) {
    assertSafeRelativePath(entry.path);
    if (entry.path === MANIFEST_PATH) continue;
    const cached = cachedEntries.get(entry.path);
    if (cached && cached.size === entry.size && cached.modifiedAt === entry.modifiedAt.toISOString()) {
      files[entry.path] = {
        size: cached.size,
        modifiedAt: cached.modifiedAt,
        sha256: cached.sha256,
      };
      continue;
    }
    const content = await readWorkspaceContent(repository, workspace, entry.path);
    contents.set(entry.path, content);
    files[entry.path] = {
      size: content.byteLength,
      modifiedAt: entry.modifiedAt.toISOString(),
      sha256: await sha256(content),
    };
  }

  return { files, contents };
}

async function readWorkspaceContent(
  repository: FileRepository,
  workspace: WorkspaceRef,
  path: string
): Promise<Uint8Array> {
  const isText = TEXT_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension));
  return isText
    ? new TextEncoder().encode(await repository.readText(workspace, path))
    : repository.readBinary(workspace, path);
}

function validateManifest(manifest: BackupManifest): void {
  if (manifest.schemaVersion !== 1 || !manifest.files || typeof manifest.files !== 'object') {
    throw new BackupError('MANIFEST_UNSUPPORTED');
  }
  for (const [path, file] of Object.entries(manifest.files)) {
    assertSafeRelativePath(path);
    if (!/^[a-f0-9]{64}$/.test(file.sha256) || file.size < 0) {
      throw new BackupError('MANIFEST_INVALID');
    }
  }
}

export async function backupWorkspace(
  repository: FileRepository,
  workspace: WorkspaceRef,
  target: BackupTarget,
  now = new Date(),
  cache?: BackupHashCache
): Promise<BackupResult> {
  const previous = await target.readManifest();
  if (previous) validateManifest(previous);
  if (!previous && (await target.listRoot()).filter((path) => path !== MANIFEST_PATH).length > 0) {
    throw new BackupError('TARGET_NOT_EMPTY');
  }

  const current = await buildManifestFiles(repository, workspace, cache);
  const uploadedPaths = Object.keys(current.files).filter(
    (path) => previous?.files[path]?.sha256 !== current.files[path].sha256
  );
  const deletedPaths = previous
    ? Object.keys(previous.files).filter((path) => !current.files[path])
    : [];

  for (const path of uploadedPaths) {
    const content = current.contents.get(path)
      ?? await readWorkspaceContent(repository, workspace, path);
    await target.upload(path, content);
  }
  for (const path of deletedPaths) {
    await target.delete(path);
  }

  const timestamp = now.toISOString();
  const manifest: BackupManifest = {
    schemaVersion: 1,
    backupId: previous?.backupId ?? crypto.randomUUID(),
    sourceWorkspaceId: workspace.id,
    appVersion: CONFIG.APP_VERSION,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    files: current.files,
  };
  await target.commitManifest(manifest);
  await cache?.save(Object.entries(current.files).map(([path, file]) => ({ path, ...file })));

  return {
    uploaded: uploadedPaths.length,
    deleted: deletedPaths.length,
    unchanged: Object.keys(current.files).length - uploadedPaths.length,
    totalBytesUploaded: uploadedPaths.reduce(
      (total, path) => total + current.files[path].size,
      0
    ),
    completedAt: timestamp,
  };
}

export async function restoreWorkspace(
  repository: FileRepository,
  workspace: WorkspaceRef,
  target: BackupTarget,
  now = new Date(),
  options: RestoreOptions = {}
): Promise<RestoreResult> {
  const manifest = await target.readManifest();
  if (!manifest) throw new BackupError('MANIFEST_INVALID');
  validateManifest(manifest);
  const existingFiles = await listWorkspaceFiles(repository, workspace);
  if (existingFiles.some(
    (entry) => !manifest.files[entry.path] && !options.skipPaths?.has(entry.path)
  )) {
    throw new BackupError('RESTORE_TARGET_NOT_EMPTY');
  }
  const existingFilesByPath = new Map(existingFiles.map((entry) => [entry.path, entry]));
  let restored = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const [path, file] of Object.entries(manifest.files)) {
    if (options.skipPaths?.has(path)) {
      skipped += 1;
      continue;
    }
    const existing = existingFilesByPath.get(path);
    if (existing?.size === file.size) {
      const localContent = await readWorkspaceContent(repository, workspace, path);
      if (await sha256(localContent) === file.sha256) {
        unchanged += 1;
        continue;
      }
    }
    const content = await target.download(path);
    if (content.byteLength !== file.size || await sha256(content) !== file.sha256) {
      throw new BackupError('INTEGRITY_CHECK_FAILED', path);
    }
    const isText = TEXT_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(extension));
    if (isText) {
      await repository.writeText(workspace, path, new TextDecoder().decode(content));
    } else {
      await repository.writeBinary(workspace, path, content);
    }
    restored += 1;
  }

  return { restored, unchanged, skipped, completedAt: now.toISOString() };
}
