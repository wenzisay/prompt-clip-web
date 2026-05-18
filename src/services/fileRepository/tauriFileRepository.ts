import { join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import {
  exists as fsExists,
  mkdir as fsMkdir,
  readDir,
  readTextFile,
  remove as fsRemove,
  rename,
  stat,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import type { DirEntry, FileInfo } from '@tauri-apps/plugin-fs';
import { Store } from '@tauri-apps/plugin-store';
import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

const STORE_FILE = 'promptclip-workspace.json';
const WORKSPACE_KEY = 'workspace';
const EXPIRED_PERMISSION_MESSAGE = '目录访问权限已过期，请重新选择数据目录';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function isSupported(): boolean {
  return isTauriRuntime();
}

function nameFromPath(path: string): string {
  const trimmed = path.replace(/[\\/]+$/g, '');
  return trimmed.split(/[\\/]/).pop() || path;
}

function workspaceFromPath(path: string): WorkspaceRef {
  return {
    id: `desktop:${path}`,
    name: nameFromPath(path),
    platform: 'desktop',
    path,
  };
}

async function loadWorkspaceStore(): Promise<Store> {
  return Store.load(STORE_FILE);
}

function requireWorkspacePath(workspace: WorkspaceRef): string {
  if (!workspace.path) {
    throw new Error(EXPIRED_PERMISSION_MESSAGE);
  }

  return workspace.path;
}

async function joinWorkspacePath(workspace: WorkspaceRef, path: string): Promise<string> {
  const root = requireWorkspacePath(workspace);
  const normalized = normalizeRelativePath(path);
  return join(root, ...normalized.split('/'));
}

function fileEntryFromInfo(path: string, info: FileInfo): FileEntry {
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');

  return {
    name: parts[parts.length - 1] ?? normalized,
    path: normalized,
    size: info.size,
    modifiedAt: info.mtime ?? new Date(0),
  };
}

async function statFileEntry(path: string, nativePath: string): Promise<FileEntry> {
  return fileEntryFromInfo(path, await stat(nativePath));
}

async function selectDirectory(): Promise<WorkspaceRef | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    recursive: true,
  });

  if (typeof selected !== 'string') {
    return null;
  }

  const workspace = workspaceFromPath(selected);
  const store = await loadWorkspaceStore();
  await store.set(WORKSPACE_KEY, workspace);
  await store.save();

  return workspace;
}

async function restoreDirectory(): Promise<WorkspaceRef | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const store = await loadWorkspaceStore();
  return (await store.get<WorkspaceRef>(WORKSPACE_KEY)) ?? null;
}

async function verifyPermission(workspace: WorkspaceRef): Promise<boolean> {
  if (!workspace.path) {
    return false;
  }

  try {
    return await fsExists(workspace.path);
  } catch {
    return false;
  }
}

async function clearSavedWorkspace(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await loadWorkspaceStore();
  await store.delete(WORKSPACE_KEY);
  await store.save();
}

async function listFiles(
  workspace: WorkspaceRef,
  extensions: string[] = [...CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS],
  options?: { includeHiddenDirectories?: boolean }
): Promise<FileEntry[]> {
  const root = requireWorkspacePath(workspace);
  const files: FileEntry[] = [];
  const normalizedExtensions = extensions.map((extension) => extension.toLowerCase());

  async function traverse(nativeDirectoryPath: string, relativeDirectoryPath: string): Promise<void> {
    const entries = await readDir(nativeDirectoryPath);

    for (const entry of entries) {
      const relativePath = relativeDirectoryPath
        ? `${relativeDirectoryPath}/${entry.name}`
        : entry.name;

      if (entry.isDirectory) {
        if (options?.includeHiddenDirectories || !entry.name.startsWith('.')) {
          await traverse(await join(nativeDirectoryPath, entry.name), relativePath);
        }
        continue;
      }

      if (isMatchingFile(entry, relativePath, normalizedExtensions)) {
        files.push(await statFileEntry(relativePath, await join(nativeDirectoryPath, entry.name)));
      }
    }
  }

  await traverse(root, '');
  return files;
}

function isMatchingFile(entry: DirEntry, path: string, extensions: string[]): boolean {
  if (!entry.isFile) {
    return false;
  }

  const lowerPath = path.toLowerCase();
  return extensions.some((extension) => lowerPath.endsWith(extension));
}

async function readText(workspace: WorkspaceRef, path: string): Promise<string> {
  return readTextFile(await joinWorkspacePath(workspace, path));
}

async function writeText(
  workspace: WorkspaceRef,
  path: string,
  content: string
): Promise<FileEntry> {
  const root = requireWorkspacePath(workspace);
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');
  const parentParts = parts.slice(0, -1);

  if (parentParts.length > 0) {
    await fsMkdir(await join(root, ...parentParts), { recursive: true });
  }

  const nativePath = await join(root, ...parts);
  await writeTextFile(nativePath, content);

  return statFileEntry(normalized, nativePath);
}

async function exists(workspace: WorkspaceRef, path: string): Promise<boolean> {
  const nativePath = await joinWorkspacePath(workspace, path);

  try {
    return await fsExists(nativePath);
  } catch {
    return false;
  }
}

async function move(workspace: WorkspaceRef, from: string, to: string): Promise<void> {
  const source = normalizeRelativePath(from);
  const target = normalizeRelativePath(to);

  if (source === target) {
    return;
  }

  await rename(
    await joinWorkspacePath(workspace, source),
    await joinWorkspacePath(workspace, target)
  );
}

async function mkdir(workspace: WorkspaceRef, path: string): Promise<void> {
  await fsMkdir(await joinWorkspacePath(workspace, path), { recursive: true });
}

async function remove(workspace: WorkspaceRef, path: string): Promise<void> {
  await fsRemove(await joinWorkspacePath(workspace, path), { recursive: true });
}

export const tauriFileRepository: FileRepository = {
  isSupported,
  selectDirectory,
  restoreDirectory,
  verifyPermission,
  clearSavedWorkspace,
  listFiles,
  readText,
  writeText,
  exists,
  move,
  mkdir,
  remove,
};
