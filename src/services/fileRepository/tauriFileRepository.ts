import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Store } from '@tauri-apps/plugin-store';
import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

const STORE_FILE = 'promptclip-workspace.json';
const WORKSPACE_KEY = 'workspace';
const EXPIRED_PERMISSION_MESSAGE = '目录访问权限已过期，请重新选择数据目录';

interface NativeFileEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

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

export async function selectTauriDirectoryForRestore(): Promise<WorkspaceRef | null> {
  const selected = await open({ directory: true, multiple: false, recursive: true });
  return typeof selected === 'string' ? workspaceFromPath(selected) : null;
}

export async function saveTauriWorkspace(workspace: WorkspaceRef): Promise<void> {
  const store = await loadWorkspaceStore();
  await store.set(WORKSPACE_KEY, workspace);
  await store.save();
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

function fileEntryFromNative(entry: NativeFileEntry): FileEntry {
  return {
    name: entry.name,
    path: entry.path,
    size: entry.size,
    modifiedAt: new Date(entry.modifiedAt),
  };
}

function workspaceArgs(workspace: WorkspaceRef): { root: string } {
  return { root: requireWorkspacePath(workspace) };
}

function workspacePathArgs(workspace: WorkspaceRef, path: string): { root: string; path: string } {
  return {
    root: requireWorkspacePath(workspace),
    path: normalizeRelativePath(path),
  };
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
    return await invoke<boolean>('workspace_root_exists', workspaceArgs(workspace));
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
  const entries = await invoke<NativeFileEntry[]>('workspace_list_files', {
    ...workspaceArgs(workspace),
    extensions,
    includeHiddenDirectories: options?.includeHiddenDirectories ?? false,
  });
  return entries.map(fileEntryFromNative);
}

async function readText(workspace: WorkspaceRef, path: string): Promise<string> {
  return invoke('workspace_read_text', workspacePathArgs(workspace, path));
}

async function readTextHead(
  workspace: WorkspaceRef,
  path: string,
  byteLimit: number
): Promise<string> {
  const full = await readText(workspace, path);
  const bytes = new TextEncoder().encode(full);
  if (bytes.byteLength <= byteLimit) {
    return full;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, byteLimit));
}

async function writeText(
  workspace: WorkspaceRef,
  path: string,
  content: string
): Promise<FileEntry> {
  const entry = await invoke<NativeFileEntry>('workspace_write_text', {
    ...workspacePathArgs(workspace, path),
    content,
  });
  return fileEntryFromNative(entry);
}

async function readBinary(workspace: WorkspaceRef, path: string): Promise<Uint8Array> {
  const content = await invoke<number[]>('workspace_read_binary', workspacePathArgs(workspace, path));
  return new Uint8Array(content);
}

async function writeBinary(
  workspace: WorkspaceRef,
  path: string,
  content: Uint8Array
): Promise<FileEntry> {
  const entry = await invoke<NativeFileEntry>('workspace_write_binary', {
    ...workspacePathArgs(workspace, path),
    content: Array.from(content),
  });
  return fileEntryFromNative(entry);
}

async function exists(workspace: WorkspaceRef, path: string): Promise<boolean> {
  const args = workspacePathArgs(workspace, path);

  try {
    return await invoke<boolean>('workspace_exists', args);
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

  await invoke('workspace_move', {
    root: requireWorkspacePath(workspace),
    from: source,
    to: target,
  });
}

async function mkdir(workspace: WorkspaceRef, path: string): Promise<void> {
  await invoke('workspace_mkdir', workspacePathArgs(workspace, path));
}

async function remove(workspace: WorkspaceRef, path: string): Promise<void> {
  await invoke('workspace_remove', workspacePathArgs(workspace, path));
}

export const tauriFileRepository: FileRepository = {
  isSupported,
  selectDirectory,
  restoreDirectory,
  verifyPermission,
  clearSavedWorkspace,
  listFiles,
  readText,
  readTextHead,
  writeText,
  readBinary,
  writeBinary,
  exists,
  move,
  mkdir,
  remove,
};
