import type { FileEntry, WorkspaceRef } from '@/types/file';
import { assertSafeRelativePath, normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

interface FakeFileRecord {
  content: string;
  modifiedAt: Date;
}

export interface FakeFileRepositoryOptions {
  files?: Record<string, string>;
  now?: () => Date;
}

export function createFakeWorkspace(): WorkspaceRef {
  return {
    id: 'fake:workspace',
    name: 'Fake Workspace',
    platform: 'web',
    handleKey: 'fake',
  };
}

export function createFakeFileRepository(
  options: FakeFileRepositoryOptions = {}
): FileRepository & { dumpFiles: () => Record<string, string> } {
  const now = options.now ?? (() => new Date('2026-05-17T00:00:00.000Z'));
  const files = new Map<string, FakeFileRecord>();

  for (const [path, content] of Object.entries(options.files ?? {})) {
    files.set(normalizeRelativePath(path), { content, modifiedAt: now() });
  }

  function entryFor(path: string, record: FakeFileRecord): FileEntry {
    const normalized = normalizeRelativePath(path);
    const parts = normalized.split('/');
    return {
      name: parts[parts.length - 1],
      path: normalized,
      size: new Blob([record.content]).size,
      modifiedAt: record.modifiedAt,
    };
  }

  return {
    isSupported: () => true,
    selectDirectory: async () => createFakeWorkspace(),
    restoreDirectory: async () => createFakeWorkspace(),
    verifyPermission: async () => true,
    clearSavedWorkspace: async () => undefined,
    listFiles: async (_workspace, extensions, options) => {
      return Array.from(files.entries())
        .filter(([path]) => {
          const parts = path.split('/');
          const isInHiddenDirectory = parts.slice(0, -1).some((part) => part.startsWith('.'));
          return (
            (options?.includeHiddenDirectories || !isInHiddenDirectory) &&
            extensions.some((extension) => path.toLowerCase().endsWith(extension))
          );
        })
        .map(([path, record]) => entryFor(path, record));
    },
    readText: async (_workspace, path) => {
      const normalized = normalizeRelativePath(path);
      const record = files.get(normalized);
      if (!record) {
        throw new Error('文件不存在或已被移动');
      }
      return record.content;
    },
    writeText: async (_workspace, path, content) => {
      const normalized = normalizeRelativePath(path);
      const record = { content, modifiedAt: now() };
      files.set(normalized, record);
      return entryFor(normalized, record);
    },
    exists: async (_workspace, path) => {
      return files.has(normalizeRelativePath(path));
    },
    move: async (_workspace, from, to) => {
      const source = normalizeRelativePath(from);
      const target = normalizeRelativePath(to);
      const record = files.get(source);
      if (!record) {
        throw new Error('文件不存在或已被移动');
      }
      files.set(target, { ...record, modifiedAt: now() });
      files.delete(source);
    },
    mkdir: async (_workspace, path) => {
      assertSafeRelativePath(path);
    },
    remove: async (_workspace, path) => {
      files.delete(normalizeRelativePath(path));
    },
    dumpFiles: () =>
      Object.fromEntries(
        Array.from(files.entries()).map(([path, record]) => [path, record.content])
      ),
  };
}
