import type { FileEntry, WorkspaceRef } from '@/types/file';
import { assertSafeRelativePath, normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

interface FakeFileRecord {
  content: string;
  modifiedAt: Date;
}

interface FakeBinaryFileRecord {
  content: Uint8Array;
  modifiedAt: Date;
}

export interface FakeFileRepositoryOptions {
  files?: Record<string, string>;
  binaryFiles?: Record<string, Uint8Array>;
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
): FileRepository & {
  dumpFiles: () => Record<string, string>;
  dumpBinaryFiles: () => Record<string, number[]>;
} {
  const now = options.now ?? (() => new Date('2026-05-17T00:00:00.000Z'));
  const files = new Map<string, FakeFileRecord>();
  const binaryFiles = new Map<string, FakeBinaryFileRecord>();

  for (const [path, content] of Object.entries(options.files ?? {})) {
    files.set(normalizeRelativePath(path), { content, modifiedAt: now() });
  }

  for (const [path, content] of Object.entries(options.binaryFiles ?? {})) {
    binaryFiles.set(normalizeRelativePath(path), { content, modifiedAt: now() });
  }

  function entryFor(path: string, record: FakeFileRecord | FakeBinaryFileRecord): FileEntry {
    const normalized = normalizeRelativePath(path);
    const parts = normalized.split('/');
    const size = 'content' in record && typeof record.content === 'string'
      ? new Blob([record.content]).size
      : (record.content as Uint8Array).byteLength;
    return {
      name: parts[parts.length - 1],
      path: normalized,
      size,
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
    readBinary: async (_workspace, path) => {
      const normalized = normalizeRelativePath(path);
      const record = binaryFiles.get(normalized);
      if (!record) {
        throw new Error('文件不存在或已被移动');
      }
      return record.content;
    },
    writeBinary: async (_workspace, path, content) => {
      const normalized = normalizeRelativePath(path);
      const record = { content, modifiedAt: now() };
      binaryFiles.set(normalized, record);
      return entryFor(normalized, record);
    },
    exists: async (_workspace, path) => {
      const normalized = normalizeRelativePath(path);
      return (
        files.has(normalized) ||
        binaryFiles.has(normalized) ||
        Array.from(files.keys()).some((filePath) => filePath.startsWith(`${normalized}/`)) ||
        Array.from(binaryFiles.keys()).some((filePath) => filePath.startsWith(`${normalized}/`))
      );
    },
    move: async (_workspace, from, to) => {
      const source = normalizeRelativePath(from);
      const target = normalizeRelativePath(to);
      const record = files.get(source);
      const binaryRecord = binaryFiles.get(source);

      if (record) {
        files.set(target, { ...record, modifiedAt: now() });
        files.delete(source);
        return;
      }

      if (binaryRecord) {
        binaryFiles.set(target, { ...binaryRecord, modifiedAt: now() });
        binaryFiles.delete(source);
        return;
      }

      const textPrefix = `${source}/`;
      const binaryPrefix = `${source}/`;
      const textEntries = Array.from(files.entries())
        .filter(([path]) => path.startsWith(textPrefix));
      const binaryEntries = Array.from(binaryFiles.entries())
        .filter(([path]) => path.startsWith(binaryPrefix));

      if (textEntries.length === 0 && binaryEntries.length === 0) {
        throw new Error('文件不存在或已被移动');
      }

      for (const [path, value] of textEntries) {
        files.set(`${target}/${path.slice(textPrefix.length)}`, { ...value, modifiedAt: now() });
        files.delete(path);
      }

      for (const [path, value] of binaryEntries) {
        binaryFiles.set(`${target}/${path.slice(binaryPrefix.length)}`, {
          ...value,
          modifiedAt: now(),
        });
        binaryFiles.delete(path);
      }
    },
    mkdir: async (_workspace, path) => {
      assertSafeRelativePath(path);
    },
    remove: async (_workspace, path) => {
      const normalized = normalizeRelativePath(path);
      files.delete(normalized);
      binaryFiles.delete(normalized);

      for (const filePath of Array.from(files.keys())) {
        if (filePath.startsWith(`${normalized}/`)) {
          files.delete(filePath);
        }
      }

      for (const filePath of Array.from(binaryFiles.keys())) {
        if (filePath.startsWith(`${normalized}/`)) {
          binaryFiles.delete(filePath);
        }
      }
    },
    dumpFiles: () =>
      Object.fromEntries(
        Array.from(files.entries()).map(([path, record]) => [path, record.content])
      ),
    dumpBinaryFiles: () =>
      Object.fromEntries(
        Array.from(binaryFiles.entries()).map(([path, record]) => [
          path,
          Array.from(record.content),
        ])
      ),
  };
}
