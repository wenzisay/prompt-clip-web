# PromptClip Desktop Multiplatform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a platform-neutral file access layer so PromptClip can keep the current Web experience and add macOS/Windows desktop builds through Tauri 2.

**Architecture:** Move browser file handles out of domain types, stores, hooks, and services. Domain code talks to a `FileRepository` interface using `WorkspaceRef`, `FileEntry`, and relative portable paths; Web and Tauri provide separate adapters behind a small repository selector.

**Tech Stack:** React 18, TypeScript, Vite, Zustand 5, Vitest, Tailwind CSS, File System Access API, Tauri 2, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-store`.

---

## Source Specs

- Design doc: `docs/PromptClip-Desktop-Multiplatform-Design.md`
- Existing implementation guide: `桌面版多端实现方案.md`
- Current commands: `npm run type-check`, `npm run lint`, `npm run test`, `npm run build`
- Tauri references checked on 2026-05-17:
  - `https://tauri.app/reference/javascript/fs/`
  - `https://tauri.app/learn/security/using-plugin-permissions/`

## File Structure

Create:

- `src/utils/path.ts` - portable relative path normalization and validation.
- `src/utils/path.test.ts` - path utility tests.
- `src/services/fileRepository/types.ts` - repository interface and shared platform types.
- `src/services/fileRepository/fakeFileRepository.ts` - in-memory test repository.
- `src/services/fileRepository/webFileRepository.ts` - File System Access API adapter.
- `src/services/fileRepository/tauriFileRepository.ts` - Tauri adapter.
- `src/services/fileRepository/index.ts` - selected repository export.
- `src/services/promptService.test.ts` - Prompt CRUD service tests using fake repository.
- `src/services/folderConfigService.test.ts` - folder config tests using fake repository.
- `src/services/exportTargetService.ts` - Web/Tauri export save abstraction.
- `src-tauri/` - Tauri project scaffold after the Web refactor is green.

Modify:

- `src/types/file.ts` - replace browser-specific directory types with portable workspace/file types.
- `src/types/prompt.ts` - replace `fileHandle` with `filePath`.
- `src/types/index.ts` - ensure new type exports are available.
- `src/utils/index.ts` - export path utilities.
- `src/services/fileService.ts` - keep only as a compatibility wrapper or remove after Web adapter migration.
- `src/services/promptService.ts` - depend on `FileRepository` and relative file paths.
- `src/services/folderConfigService.ts` - depend on `FileRepository`.
- `src/services/exportService.ts` - use `exportTargetService`.
- `src/services/index.ts` - export repository modules and updated services.
- `src/stores/fileStore.ts` - expose `workspace` instead of `directoryHandle`.
- `src/stores/tagStore.ts` - persist pinned tags through repository/workspace.
- `src/hooks/useDirectoryPicker.ts` - return `WorkspaceRef`.
- `src/hooks/usePromptLoader.ts` - load by workspace.
- `src/App.tsx` - gate app by `workspace`.
- `src/components/WelcomeScreen.tsx` - keep UI copy, use updated hook return type.
- `src/components/prompt/CreateModal.tsx`
- `src/components/prompt/PromptCard.tsx`
- `src/components/prompt/PromptGrid.tsx`
- `src/components/prompt/DeleteConfirm.tsx`
- `src/components/layout/DetailPanel.tsx`
- `src/components/tag/TagTree.tsx`
- `package.json` - add Tauri scripts/dependencies when scaffold starts.

Do not modify unrelated docs or move existing Milestone files in this plan.

---

### Task 1: Path Utilities

**Files:**
- Create: `src/utils/path.ts`
- Create: `src/utils/path.test.ts`
- Modify: `src/utils/index.ts`

- [ ] **Step 1: Write failing path utility tests**

Create `src/utils/path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  assertSafeRelativePath,
  joinPath,
  normalizeRelativePath,
  sanitizeFilename,
  toPortablePath,
} from './path';

describe('path utilities', () => {
  it('normalizes separators and removes duplicate slashes', () => {
    expect(toPortablePath('folder\\child\\file.md')).toBe('folder/child/file.md');
    expect(normalizeRelativePath('folder//child///file.md')).toBe('folder/child/file.md');
  });

  it('joins path parts using portable separators', () => {
    expect(joinPath('folder', 'child', 'file.md')).toBe('folder/child/file.md');
    expect(joinPath('folder/', '/child/', 'file.md')).toBe('folder/child/file.md');
  });

  it('rejects unsafe relative paths', () => {
    expect(() => assertSafeRelativePath('')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('/absolute.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('../outside.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('folder/../outside.md')).toThrow('文件路径不合法');
  });

  it('keeps safe relative paths', () => {
    expect(() => assertSafeRelativePath('folder/file.md')).not.toThrow();
    expect(normalizeRelativePath('folder/file.md')).toBe('folder/file.md');
  });

  it('sanitizes cross-platform filenames', () => {
    expect(sanitizeFilename('CON')).toBe('CON-');
    expect(sanitizeFilename('hello/world:prompt')).toBe('hello-world-prompt');
    expect(sanitizeFilename('  prompt  ')).toBe('prompt');
  });
});
```

- [ ] **Step 2: Run path tests and verify they fail**

Run:

```bash
npm run test -- src/utils/path.test.ts --run
```

Expected: FAIL because `src/utils/path.ts` does not exist.

- [ ] **Step 3: Implement path utilities**

Create `src/utils/path.ts`:

```ts
const RESERVED_WINDOWS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

export function toPortablePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function normalizeRelativePath(path: string): string {
  const normalized = toPortablePath(path)
    .split('/')
    .filter((part) => part.length > 0)
    .join('/');

  assertSafeRelativePath(normalized);
  return normalized;
}

export function joinPath(...parts: string[]): string {
  return normalizeRelativePath(parts.map(toPortablePath).join('/'));
}

export function assertSafeRelativePath(path: string): void {
  const portable = toPortablePath(path);
  const parts = portable.split('/');

  if (
    portable.length === 0 ||
    portable.startsWith('/') ||
    /^[A-Za-z]:\//.test(portable) ||
    parts.some((part) => part === '..')
  ) {
    throw new Error('文件路径不合法');
  }
}

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '');

  if (!sanitized) {
    return 'untitled';
  }

  const upperName = sanitized.toUpperCase();
  return RESERVED_WINDOWS_NAMES.has(upperName) ? `${sanitized}-` : sanitized;
}
```

Modify `src/utils/index.ts`:

```ts
export * from './date';
export * from './debounce';
export * from './id';
export * from './markdown';
export * from './path';
export * from './storage';
```

- [ ] **Step 4: Run path tests and verify they pass**

Run:

```bash
npm run test -- src/utils/path.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/path.ts src/utils/path.test.ts src/utils/index.ts
git commit -m "test: add portable path utilities"
```

---

### Task 2: Repository Types And Fake Repository

**Files:**
- Modify: `src/types/file.ts`
- Create: `src/services/fileRepository/types.ts`
- Create: `src/services/fileRepository/fakeFileRepository.ts`
- Create: `src/services/fileRepository/index.ts`
- Modify: `src/services/index.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace file types**

Modify `src/types/file.ts` to this content:

```ts
export type PlatformKind = 'web' | 'desktop';

export interface WorkspaceRef {
  id: string;
  name: string;
  platform: PlatformKind;
  path?: string;
  handleKey?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
}

export type DirectoryPermission = 'granted' | 'denied' | 'prompt';

export const SUPPORTED_FILE_EXTENSIONS = ['.md'] as const;
export type SupportedFileExtension = typeof SUPPORTED_FILE_EXTENSIONS[number];
```

- [ ] **Step 2: Add repository interface**

Create `src/services/fileRepository/types.ts`:

```ts
import type { FileEntry, WorkspaceRef } from '@/types/file';

export interface FileRepository {
  isSupported(): boolean;
  selectDirectory(): Promise<WorkspaceRef | null>;
  restoreDirectory(): Promise<WorkspaceRef | null>;
  verifyPermission(workspace: WorkspaceRef): Promise<boolean>;
  clearSavedWorkspace(): Promise<void>;
  listFiles(
    workspace: WorkspaceRef,
    extensions: string[],
    options?: { includeHiddenDirectories?: boolean }
  ): Promise<FileEntry[]>;
  readText(workspace: WorkspaceRef, path: string): Promise<string>;
  writeText(workspace: WorkspaceRef, path: string, content: string): Promise<FileEntry>;
  exists(workspace: WorkspaceRef, path: string): Promise<boolean>;
  move(workspace: WorkspaceRef, from: string, to: string): Promise<void>;
  mkdir(workspace: WorkspaceRef, path: string): Promise<void>;
  remove(workspace: WorkspaceRef, path: string): Promise<void>;
}
```

- [ ] **Step 3: Add fake repository for tests**

Create `src/services/fileRepository/fakeFileRepository.ts`:

```ts
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
    dumpFiles: () => Object.fromEntries(Array.from(files.entries()).map(([path, record]) => [path, record.content])),
  };
}
```

- [ ] **Step 4: Add barrel exports**

Create `src/services/fileRepository/index.ts`:

```ts
export type { FileRepository } from './types';
export { createFakeFileRepository, createFakeWorkspace } from './fakeFileRepository';
```

Modify `src/services/index.ts` by adding:

```ts
export * from './fileRepository';
```

Ensure `src/types/index.ts` exports file types:

```ts
export * from './file';
export * from './prompt';
export * from './tag';
export * from './ui';
```

- [ ] **Step 5: Run type check**

Run:

```bash
npm run type-check
```

Expected: FAIL until later tasks migrate existing browser-specific callers. Confirm the only new issues are downstream references to removed `DirectoryInfo.handle` if any appear.

- [ ] **Step 6: Commit**

```bash
git add src/types/file.ts src/types/index.ts src/services/fileRepository src/services/index.ts
git commit -m "feat: add platform neutral file repository types"
```

---

### Task 3: Web File Repository

**Files:**
- Create: `src/services/fileRepository/webFileRepository.ts`
- Modify: `src/services/fileRepository/index.ts`
- Modify: `src/services/fileService.ts`

- [ ] **Step 1: Create Web adapter from existing file service behavior**

Create `src/services/fileRepository/webFileRepository.ts`:

```ts
import { CONFIG } from '@/constants/config';
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { normalizeRelativePath } from '@/utils/path';
import type { FileRepository } from './types';

const DB_NAME = 'promptclip-file-handles';
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';

function isFileAPISupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'indexedDB' in window;
}

function workspaceFromHandle(handle: FileSystemDirectoryHandle): WorkspaceRef {
  return {
    id: `web:${handle.name}`,
    name: handle.name,
    platform: 'web',
    handleKey: DIRECTORY_KEY,
  };
}

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, DIRECTORY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openHandleDB();
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(DIRECTORY_KEY);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function deleteSavedDirectoryHandle(): Promise<void> {
  const db = await openHandleDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(DIRECTORY_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getWorkspaceHandle(): Promise<FileSystemDirectoryHandle> {
  const handle = await getSavedDirectoryHandle();
  if (!handle) {
    throw new Error('目录访问权限已过期，请重新选择数据目录');
  }
  return handle;
}

async function resolveFilePath(
  directoryHandle: FileSystemDirectoryHandle,
  path: string,
  createDirectories: boolean
): Promise<{ directory: FileSystemDirectoryHandle; name: string }> {
  const normalized = normalizeRelativePath(path);
  const parts = normalized.split('/');
  const name = parts.pop();

  if (!name) {
    throw new Error('文件路径不合法');
  }

  let directory = directoryHandle;
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, { create: createDirectories });
  }

  return { directory, name };
}

async function fileEntryFromHandle(path: string, fileHandle: FileSystemFileHandle): Promise<FileEntry> {
  const file = await fileHandle.getFile();
  return {
    name: fileHandle.name,
    path: normalizeRelativePath(path),
    size: file.size,
    modifiedAt: new Date(file.lastModified),
  };
}

export const webFileRepository: FileRepository = {
  isSupported: isFileAPISupported,
  async selectDirectory() {
    if (!isFileAPISupported()) {
      throw new Error('当前环境不支持选择本地目录');
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });
      await saveDirectoryHandle(handle);
      return workspaceFromHandle(handle);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  },
  async restoreDirectory() {
    if (!isFileAPISupported()) {
      return null;
    }
    const handle = await getSavedDirectoryHandle();
    return handle ? workspaceFromHandle(handle) : null;
  },
  async verifyPermission() {
    const handle = await getWorkspaceHandle();
    const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }
    return (await handle.requestPermission(options)) === 'granted';
  },
  clearSavedWorkspace: deleteSavedDirectoryHandle,
  async listFiles(_workspace, extensions = CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS, options) {
    const directoryHandle = await getWorkspaceHandle();
    const files: FileEntry[] = [];

    async function traverse(dirHandle: FileSystemDirectoryHandle, parentPath: string) {
      for await (const entry of dirHandle.values()) {
        const entryPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
          const lowerName = entry.name.toLowerCase();
          if (extensions.some((extension) => lowerName.endsWith(extension))) {
            files.push(await fileEntryFromHandle(entryPath, entry as FileSystemFileHandle));
          }
        } else if (
          entry.kind === 'directory' &&
          (options?.includeHiddenDirectories || !entry.name.startsWith('.'))
        ) {
          await traverse(entry as FileSystemDirectoryHandle, entryPath);
        }
      }
    }

    await traverse(directoryHandle, '');
    return files;
  },
  async readText(_workspace, path) {
    const directoryHandle = await getWorkspaceHandle();
    const { directory, name } = await resolveFilePath(directoryHandle, path, false);
    const fileHandle = await directory.getFileHandle(name);
    return await (await fileHandle.getFile()).text();
  },
  async writeText(_workspace, path, content) {
    const directoryHandle = await getWorkspaceHandle();
    const { directory, name } = await resolveFilePath(directoryHandle, path, true);
    const fileHandle = await directory.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return fileEntryFromHandle(path, fileHandle);
  },
  async exists(_workspace, path) {
    try {
      const directoryHandle = await getWorkspaceHandle();
      const { directory, name } = await resolveFilePath(directoryHandle, path, false);
      await directory.getFileHandle(name);
      return true;
    } catch {
      return false;
    }
  },
  async move(workspace, from, to) {
    const content = await this.readText(workspace, from);
    await this.writeText(workspace, to, content);
    await this.remove(workspace, from);
  },
  async mkdir(_workspace, path) {
    const directoryHandle = await getWorkspaceHandle();
    const parts = normalizeRelativePath(path).split('/');
    let directory = directoryHandle;
    for (const part of parts) {
      directory = await directory.getDirectoryHandle(part, { create: true });
    }
  },
  async remove(_workspace, path) {
    const directoryHandle = await getWorkspaceHandle();
    const { directory, name } = await resolveFilePath(directoryHandle, path, false);
    await directory.removeEntry(name);
  },
};
```

- [ ] **Step 2: Export selected repository**

Modify `src/services/fileRepository/index.ts`:

```ts
export type { FileRepository } from './types';
export { createFakeFileRepository, createFakeWorkspace } from './fakeFileRepository';
export { webFileRepository } from './webFileRepository';
export { webFileRepository as fileRepository } from './webFileRepository';
```

- [ ] **Step 3: Keep `fileService.ts` temporarily compatible**

Leave existing `src/services/fileService.ts` in place until all callers are migrated. Do not delete it in this task.

- [ ] **Step 4: Run type check**

Run:

```bash
npm run type-check
```

Expected: Existing browser-specific service/store/component errors remain. No errors should originate from `webFileRepository.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/services/fileRepository/webFileRepository.ts src/services/fileRepository/index.ts
git commit -m "feat: add web file repository adapter"
```

---

### Task 4: Prompt Type And PromptService Refactor

**Files:**
- Modify: `src/types/prompt.ts`
- Modify: `src/services/promptService.ts`
- Create: `src/services/promptService.test.ts`

- [ ] **Step 1: Write service tests against fake repository**

Create `src/services/promptService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { PromptService } from './promptService';

const workspace = createFakeWorkspace();

describe('PromptService repository integration', () => {
  it('loads prompts from markdown files with file paths', async () => {
    const repository = createFakeFileRepository({
      files: {
        'hello.md': [
          '---',
          'title: Hello',
          'tags:',
          '  - test',
          'copy_count: 2',
          'pinned: true',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const prompts = await PromptService.loadPrompts(repository, workspace);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      id: 'hello',
      title: 'Hello',
      content: 'Body',
      tags: ['test'],
      copyCount: 2,
      pinned: true,
      filePath: 'hello.md',
    });
  });

  it('creates, updates with history, and deletes via repository paths', async () => {
    const repository = createFakeFileRepository();

    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'My Prompt',
      content: 'First',
      tags: ['work'],
    });
    expect(created.filePath).toBe('My Prompt.md');

    const updated = await PromptService.updatePrompt(repository, workspace, created, {
      id: created.id,
      title: 'My Prompt Renamed',
      content: 'Second',
      tags: ['work', 'done'],
    });

    expect(updated.filePath).toBe('My Prompt Renamed.md');
    expect(await repository.exists(workspace, 'My Prompt.md')).toBe(false);
    expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(true);

    await PromptService.deletePrompt(repository, workspace, updated);
    expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(false);

    const files = repository.dumpFiles();
    expect(Object.keys(files).some((path) => path.startsWith('.history/'))).toBe(true);
    expect(Object.keys(files).some((path) => path.startsWith('.trash/'))).toBe(true);
  });

  it('does not create history for copy count and pinned updates', async () => {
    const repository = createFakeFileRepository();
    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'Counter',
      content: 'Text',
      tags: [],
    });

    await PromptService.incrementCopyCount(repository, workspace, created);
    await PromptService.togglePinned(repository, workspace, created);

    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm run test -- src/services/promptService.test.ts --run
```

Expected: FAIL because `PromptService` still accepts browser file handles.

- [ ] **Step 3: Update Prompt type**

Modify `src/types/prompt.ts` so `Prompt` ends with:

```ts
  /** 相对工作区根目录的 Markdown 文件路径 */
  filePath: string;
}
```

Remove the `fileHandle?: FileSystemFileHandle;` property and its comment.

- [ ] **Step 4: Refactor PromptService signatures**

Modify `src/services/promptService.ts` imports:

```ts
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
```

Replace exported function signatures with:

```ts
export async function loadPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  entry: FileEntry
): Promise<Prompt>
```

```ts
export async function loadPrompts(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<Prompt[]>
```

```ts
export async function createPrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  input: CreatePromptInput
): Promise<Prompt>
```

```ts
export async function updatePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt,
  updates: UpdatePromptInput,
  options: { createHistory?: boolean } = {}
): Promise<Prompt>
```

```ts
export async function deletePrompt(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void>
```

```ts
export async function incrementCopyCount(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<Prompt>
```

```ts
export async function togglePinned(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<Prompt>
```

```ts
export async function createHistoryVersion(
  repository: FileRepository,
  workspace: WorkspaceRef,
  prompt: Prompt
): Promise<void>
```

```ts
export async function validatePromptTitle(
  repository: FileRepository,
  workspace: WorkspaceRef,
  title: string,
  currentPromptId?: string
): Promise<void>
```

```ts
export async function getHistoryVersions(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<Array<{ filename: string; date: Date }>>
```

- [ ] **Step 5: Replace file handle operations with repository operations**

Use these mappings inside `src/services/promptService.ts`:

```ts
const rawContent = await repository.readText(workspace, entry.path);
const fileTitle = idFromFilename(entry.name);
```

Return loaded prompt with:

```ts
filePath: entry.path,
createdAt: metadata.created ? new Date(metadata.created) : entry.modifiedAt,
updatedAt: metadata.modified ? new Date(metadata.modified) : entry.modifiedAt,
```

List prompts with:

```ts
const entries = await repository.listFiles(workspace, CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS);
```

Create prompt with:

```ts
const filename = filenameFromTitle(title);
const entry = await repository.writeText(workspace, filename, content);
```

Update prompt with:

```ts
const oldFilename = prompt.filePath || filenameFromId(prompt.id);
const nextFilename = filenameFromTitle(updatedPrompt.title);
const entry = await repository.writeText(workspace, nextFilename, content);

if (oldFilename !== nextFilename && await repository.exists(workspace, oldFilename)) {
  await repository.remove(workspace, oldFilename);
}
```

Delete prompt with:

```ts
const filename = prompt.filePath || filenameFromId(prompt.id);
const timestamp = formatDateForFile(new Date());
const trashFilename = `${idFromFilename(filename)}.${timestamp}.md`;
await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.TRASH_DIR);
await repository.move(workspace, filename, joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, trashFilename));
```

Create history with:

```ts
await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.HISTORY_DIR);
const timestamp = formatDateForFile(prompt.updatedAt);
const historyFilename = `${prompt.id}.${timestamp}.md`;
const content = await repository.readText(workspace, prompt.filePath);
await repository.writeText(workspace, joinPath(CONFIG.FILE_SYSTEM.HISTORY_DIR, historyFilename), content);
await cleanupOldHistoryVersions(repository, workspace, prompt.id);
```

For `cleanupOldHistoryVersions`, get history entries from:

```ts
const historyEntries = await repository.listFiles(
  workspace,
  CONFIG.FILE_SYSTEM.SUPPORTED_EXTENSIONS,
  { includeHiddenDirectories: true }
);
const historyFiles = historyEntries
  .filter((entry) => entry.path.startsWith(`${CONFIG.FILE_SYSTEM.HISTORY_DIR}/`) && entry.name.startsWith(promptId))
  .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
```

Then remove old files with:

```ts
await repository.remove(workspace, oldEntry.path);
```

- [ ] **Step 6: Run PromptService tests**

Run:

```bash
npm run test -- src/services/promptService.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Run type check**

Run:

```bash
npm run type-check
```

Expected: FAIL in callers that still pass `directoryHandle` to `PromptService`; no failures remain inside `promptService.ts` or `prompt.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/types/prompt.ts src/services/promptService.ts src/services/promptService.test.ts
git commit -m "feat: make prompt service repository based"
```

---

### Task 5: Folder Config And Tag Store

**Files:**
- Modify: `src/services/folderConfigService.ts`
- Create: `src/services/folderConfigService.test.ts`
- Modify: `src/stores/tagStore.ts`

- [ ] **Step 1: Write folder config tests**

Create `src/services/folderConfigService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { FolderConfigService } from './folderConfigService';

const workspace = createFakeWorkspace();

describe('FolderConfigService', () => {
  it('returns defaults when config does not exist', async () => {
    const repository = createFakeFileRepository();
    await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
      pinnedTags: [],
    });
  });

  it('normalizes invalid pinned tags', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.promptclip.json': JSON.stringify({
          pinnedTags: ['ai', 'ai', 1, 'work'],
        }),
      },
    });

    await expect(FolderConfigService.readFolderConfig(repository, workspace)).resolves.toEqual({
      pinnedTags: ['ai', 'work'],
    });
  });

  it('writes pinned tags to config file', async () => {
    const repository = createFakeFileRepository();
    await FolderConfigService.updatePinnedTags(repository, workspace, ['ai', 'work']);
    const content = await repository.readText(workspace, '.promptclip.json');
    expect(JSON.parse(content)).toEqual({ pinnedTags: ['ai', 'work'] });
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm run test -- src/services/folderConfigService.test.ts --run
```

Expected: FAIL because `FolderConfigService` still expects `FileSystemDirectoryHandle`.

- [ ] **Step 3: Refactor FolderConfigService**

Modify imports:

```ts
import type { WorkspaceRef } from '@/types/file';
import type { FileRepository } from '@/services/fileRepository';
```

Change function signatures:

```ts
export async function readFolderConfig(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<FolderConfig>
```

```ts
export async function folderConfigExists(
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<boolean>
```

```ts
export async function writeFolderConfig(
  repository: FileRepository,
  workspace: WorkspaceRef,
  config: FolderConfig
): Promise<void>
```

```ts
export async function updatePinnedTags(
  repository: FileRepository,
  workspace: WorkspaceRef,
  pinnedTags: string[]
): Promise<void>
```

Replace file operations:

```ts
const content = await repository.readText(workspace, CONFIG_FILENAME);
```

```ts
return await repository.exists(workspace, CONFIG_FILENAME);
```

```ts
await repository.writeText(
  workspace,
  CONFIG_FILENAME,
  `${JSON.stringify(normalizedConfig, null, 2)}\n`
);
```

- [ ] **Step 4: Refactor tag store signatures**

Modify `src/stores/tagStore.ts` imports:

```ts
import type { WorkspaceRef } from '@/types/file';
import { fileRepository } from '@/services/fileRepository';
```

Change helper:

```ts
async function savePinnedTags(
  workspace: WorkspaceRef | null | undefined,
  pinnedTags: string[]
) {
  if (!workspace) return;

  try {
    await FolderConfigService.updatePinnedTags(fileRepository, workspace, pinnedTags);
  } catch (error) {
    console.warn('Failed to persist pinned tags:', error);
  }
}
```

Change state methods:

```ts
loadPinnedTags: (workspace: WorkspaceRef) => Promise<void>;
togglePin: (tagName: string, workspace?: WorkspaceRef | null) => Promise<void>;
renamePinnedTag: (oldTagName: string, newTagName: string, workspace?: WorkspaceRef | null) => Promise<void>;
removePinnedTag: (tagName: string, workspace?: WorkspaceRef | null) => Promise<void>;
```

Change loading:

```ts
const hasFolderConfig = await FolderConfigService.folderConfigExists(fileRepository, workspace);
const config = await FolderConfigService.readFolderConfig(fileRepository, workspace);
```

- [ ] **Step 5: Run folder config tests**

Run:

```bash
npm run test -- src/services/folderConfigService.test.ts --run
```

Expected: PASS.

- [ ] **Step 6: Run type check**

Run:

```bash
npm run type-check
```

Expected: FAIL in remaining `directoryHandle` callers. No failures should remain in `folderConfigService.ts` or `tagStore.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/services/folderConfigService.ts src/services/folderConfigService.test.ts src/stores/tagStore.ts
git commit -m "feat: persist folder config through repository"
```

---

### Task 6: File Store And Directory Hooks

**Files:**
- Modify: `src/stores/fileStore.ts`
- Modify: `src/hooks/useDirectoryPicker.ts`
- Modify: `src/hooks/usePromptLoader.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Refactor file store state**

Replace `FileState` in `src/stores/fileStore.ts` with:

```ts
interface FileState {
  isSupported: boolean;
  isAuthorized: boolean;
  workspace: WorkspaceRef | null;
  workspaceName: string | null;
  lastAccessTime: Date | null;
  isLoading: boolean;
  error: string | null;
  setWorkspace: (workspace: WorkspaceRef | null) => void;
  clearWorkspace: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => Promise<void>;
}
```

Use imports:

```ts
import type { WorkspaceRef } from '@/types/file';
import { fileRepository } from '@/services/fileRepository';
```

Remove IndexedDB helper functions from `fileStore.ts`; Web persistence now belongs to `webFileRepository.ts`.

- [ ] **Step 2: Implement workspace store actions**

Use this store behavior:

```ts
setWorkspace: (workspace) => {
  set({
    isAuthorized: Boolean(workspace),
    workspace,
    workspaceName: workspace?.name ?? null,
    lastAccessTime: workspace ? new Date() : null,
    error: null,
  });
},

clearWorkspace: async () => {
  await fileRepository.clearSavedWorkspace();
  set({
    isAuthorized: false,
    workspace: null,
    workspaceName: null,
    lastAccessTime: null,
    error: null,
  });
},

initialize: async () => {
  const isSupported = fileRepository.isSupported();
  set({ isSupported });

  if (!isSupported) {
    set({ isAuthorized: false, workspace: null });
    return;
  }

  try {
    const workspace = await fileRepository.restoreDirectory();
    if (!workspace) {
      set({ isAuthorized: false, workspace: null });
      return;
    }

    const permission = await fileRepository.verifyPermission(workspace);
    set({
      isAuthorized: permission,
      workspace: permission ? workspace : null,
      workspaceName: permission ? workspace.name : null,
      error: permission ? null : '目录访问权限已过期，请重新选择数据目录',
    });
  } catch (error) {
    console.warn('Failed to restore workspace:', error);
    set({ isAuthorized: false, workspace: null });
  }
},
```

Persist only:

```ts
partialize: (state) => ({
  isAuthorized: state.isAuthorized,
  workspaceName: state.workspaceName,
  lastAccessTime: state.lastAccessTime,
}),
```

- [ ] **Step 3: Refactor directory picker hook**

Update `src/hooks/useDirectoryPicker.ts` return type:

```ts
import type { WorkspaceRef } from '@/types/file';
import { fileRepository } from '@/services/fileRepository';

interface UseDirectoryPickerReturn {
  isAuthorized: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  openDirectory: () => Promise<WorkspaceRef | null>;
  clearDirectory: () => Promise<void>;
}
```

Change `openDirectory` body:

```ts
const workspace = await fileRepository.selectDirectory();

if (workspace) {
  const hasPermission = await fileRepository.verifyPermission(workspace);
  if (hasPermission) {
    setWorkspace(workspace);
    return workspace;
  }
  setError('未授予目录访问权限');
  setWorkspace(null);
  return null;
}

setLoading(false);
return null;
```

Change clear:

```ts
const clearDirectory = useCallback(async () => {
  await clearWorkspace();
}, [clearWorkspace]);
```

- [ ] **Step 4: Refactor prompt loader**

In `src/hooks/usePromptLoader.ts`, replace `directoryHandle` with `workspace`:

```ts
const { workspace, isAuthorized } = useFileStore();
```

Use repository calls:

```ts
if (!isAuthorized || !workspace) {
  return;
}

await loadPinnedTags(workspace);
const prompts = await PromptService.loadPrompts(fileRepository, workspace);
```

Update effect dependencies to include `workspace`.

- [ ] **Step 5: Refactor App gate**

In `src/App.tsx`, replace:

```ts
const { isAuthorized, directoryHandle, initialize } = useFileStore();
```

with:

```ts
const { isAuthorized, workspace, initialize } = useFileStore();
```

Replace gate:

```ts
if (!isAuthorized || !workspace) {
  return <WelcomeScreen />;
}
```

- [ ] **Step 6: Run type check**

Run:

```bash
npm run type-check
```

Expected: FAIL only in components still reading `directoryHandle`.

- [ ] **Step 7: Commit**

```bash
git add src/stores/fileStore.ts src/hooks/useDirectoryPicker.ts src/hooks/usePromptLoader.ts src/App.tsx
git commit -m "feat: store current workspace instead of directory handle"
```

---

### Task 7: Component Call Site Migration

**Files:**
- Modify: `src/components/prompt/CreateModal.tsx`
- Modify: `src/components/prompt/PromptCard.tsx`
- Modify: `src/components/prompt/PromptGrid.tsx`
- Modify: `src/components/prompt/DeleteConfirm.tsx`
- Modify: `src/components/layout/DetailPanel.tsx`
- Modify: `src/components/tag/TagTree.tsx`

- [ ] **Step 1: Migrate PromptService imports**

In each component that calls `PromptService`, add:

```ts
import { fileRepository } from '@/services/fileRepository';
```

- [ ] **Step 2: Replace file store selector**

Replace:

```ts
const { directoryHandle } = useFileStore();
```

with:

```ts
const { workspace } = useFileStore();
```

- [ ] **Step 3: Update prompt create call**

In `src/components/prompt/CreateModal.tsx`, replace guards:

```ts
if (!workspace) {
  return;
}
```

Replace create call:

```ts
const newPrompt = await PromptService.createPrompt(fileRepository, workspace, {
  title: formData.title,
  content: formData.content,
  tags: formData.tags,
});
```

Replace update call:

```ts
const updatedPrompt = await PromptService.updatePrompt(
  fileRepository,
  workspace,
  existing,
  {
    id: existing.id,
    title: formData.title,
    content: formData.content,
    tags: formData.tags,
  }
);
```

- [ ] **Step 4: Update prompt card actions**

In `src/components/prompt/PromptCard.tsx`, replace:

```ts
if (workspace) {
  const updated = await PromptService.incrementCopyCount(fileRepository, workspace, prompt);
  updatePrompt(updated);
}
```

Replace pinned toggle:

```ts
if (!workspace) return;
const updated = await PromptService.togglePinned(fileRepository, workspace, prompt);
updatePrompt(updated);
```

- [ ] **Step 5: Update detail panel actions**

In `src/components/layout/DetailPanel.tsx`, use the same `workspace` guarded calls as PromptCard for copy count and pinned toggle.

- [ ] **Step 6: Update prompt grid delete**

In `src/components/prompt/PromptGrid.tsx`, replace batch delete guard:

```ts
if (!workspace || selectedPromptIds.length === 0) return;
```

Replace delete call:

```ts
await PromptService.deletePrompt(fileRepository, workspace, prompt);
```

- [ ] **Step 7: Update delete confirm**

In `src/components/prompt/DeleteConfirm.tsx`, replace delete call:

```ts
if (!prompt || !workspace) return;
await PromptService.deletePrompt(fileRepository, workspace, prompt);
deletePrompt(prompt.id);
closeModal();
```

- [ ] **Step 8: Update tag tree persistence**

In `src/components/tag/TagTree.tsx`, pass `workspace` to tag store methods:

```ts
void togglePin(node.name, workspace);
await renamePinnedTag(node.name, nextTag, workspace);
await removePinnedTag(node.name, workspace);
```

Replace disabled checks:

```ts
disabled={!workspace || isBusy}
```

- [ ] **Step 9: Verify no component references browser handles**

Run:

```bash
rg -n "directoryHandle|FileSystemDirectoryHandle|FileSystemFileHandle|fileHandle" src
```

Expected: Matches only in `src/vite-env.d.ts`, `src/services/fileRepository/webFileRepository.ts`, and temporary `src/services/fileService.ts`.

- [ ] **Step 10: Run type check**

Run:

```bash
npm run type-check
```

Expected: PASS or failures only from `src/services/fileService.ts` being stale and unused.

- [ ] **Step 11: Commit**

```bash
git add src/components/prompt/CreateModal.tsx src/components/prompt/PromptCard.tsx src/components/prompt/PromptGrid.tsx src/components/prompt/DeleteConfirm.tsx src/components/layout/DetailPanel.tsx src/components/tag/TagTree.tsx
git commit -m "feat: migrate components to workspace file access"
```

---

### Task 8: Remove Legacy FileService From Business Path

**Files:**
- Modify or Delete: `src/services/fileService.ts`
- Modify: `src/services/index.ts`

- [ ] **Step 1: Confirm legacy service is unused**

Run:

```bash
rg -n "FileService|fileService" src
```

Expected: Only `src/services/fileService.ts` and possibly `src/services/index.ts` reference it.

- [ ] **Step 2: Remove legacy export**

If `src/services/index.ts` still exports `fileService`, remove:

```ts
export * from './fileService';
```

- [ ] **Step 3: Delete legacy service file**

Delete `src/services/fileService.ts` after confirming no imports remain.

- [ ] **Step 4: Run full Web verification**

Run:

```bash
npm run test -- --run
npm run type-check
npm run lint
npm run build
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/index.ts
git rm src/services/fileService.ts
git commit -m "refactor: remove legacy browser file service"
```

---

### Task 9: Export Save Abstraction

**Files:**
- Create: `src/services/exportTargetService.ts`
- Modify: `src/services/exportService.ts`
- Modify: `src/services/index.ts`

- [ ] **Step 1: Add export target service**

Create `src/services/exportTargetService.ts`:

```ts
export async function saveExportBlob(blob: Blob, filename: string): Promise<void> {
  const maybeTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (maybeTauri) {
    const dialogPlugin = '@tauri-apps/plugin-dialog';
    const fsPlugin = '@tauri-apps/plugin-fs';
    const { save } = await import(/* @vite-ignore */ dialogPlugin) as {
      save: (options: {
        defaultPath: string;
        filters: Array<{ name: string; extensions: string[] }>;
      }) => Promise<string | null>;
    };
    const { writeFile } = await import(/* @vite-ignore */ fsPlugin) as {
      writeFile: (path: string, data: Uint8Array) => Promise<void>;
    };
    const path = await save({
      defaultPath: filename,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });

    if (!path) {
      return;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(path, bytes);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ExportTargetService = {
  saveExportBlob,
} as const;
```

- [ ] **Step 2: Update export service**

In `src/services/exportService.ts`, import:

```ts
import { ExportTargetService } from './exportTargetService';
```

Replace `downloadBlob(blob, filename)` calls with:

```ts
await ExportTargetService.saveExportBlob(blob, filename);
```

Update export function signatures to `async` where needed. Remove the old `downloadBlob` helper after all calls are migrated.

- [ ] **Step 3: Export service barrel**

Add to `src/services/index.ts`:

```ts
export * from './exportTargetService';
```

- [ ] **Step 4: Run verification**

Run:

```bash
npm run type-check
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/exportTargetService.ts src/services/exportService.ts src/services/index.ts
git commit -m "feat: abstract export file saving"
```

---

### Task 10: Tauri Scaffold

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [ ] **Step 1: Install Tauri CLI and plugins**

Run:

```bash
npm install --save-dev @tauri-apps/cli
npm install @tauri-apps/api @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-store
```

Expected: `package.json` and lockfile update.

- [ ] **Step 2: Initialize Tauri without moving frontend files**

Run:

```bash
npx tauri init --ci --app-name PromptClip --window-title PromptClip --frontend-dist ../dist --dev-url http://localhost:5173
```

Expected: `src-tauri/` exists and React source remains in `src/`.

- [ ] **Step 3: Register plugins**

In `src-tauri/src/lib.rs`, ensure builder includes:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

In `src-tauri/src/main.rs`, ensure:

```rust
fn main() {
    promptclip_lib::run()
}
```

- [ ] **Step 4: Configure package scripts**

Add scripts to `package.json`:

```json
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 5: Configure minimal capabilities**

In `src-tauri/capabilities/default.json`, include dialog, fs, and store permissions needed by the plugins. Start with generated plugin permissions from Tauri CLI, then restrict fs scope after Task 11 validates path behavior.

- [ ] **Step 6: Run scaffold verification**

Run:

```bash
npm run build
npm run tauri:dev
```

Expected: Web build passes and Tauri opens the PromptClip window. Stop the dev process after the window loads.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src-tauri
git commit -m "feat: add tauri desktop scaffold"
```

---

### Task 11: Tauri File Repository

**Files:**
- Create: `src/services/fileRepository/tauriFileRepository.ts`
- Modify: `src/services/fileRepository/index.ts`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Implement desktop adapter**

Create `src/services/fileRepository/tauriFileRepository.ts`:

```ts
import type { FileEntry, WorkspaceRef } from '@/types/file';
import { assertSafeRelativePath, normalizeRelativePath, toPortablePath } from '@/utils/path';
import type { FileRepository } from './types';

const STORE_FILE = 'promptclip-workspace.json';
const WORKSPACE_KEY = 'workspace';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function nameFromPath(path: string): string {
  const portable = toPortablePath(path);
  const parts = portable.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

async function loadStore() {
  const { Store } = await import('@tauri-apps/plugin-store');
  return await Store.load(STORE_FILE);
}

function requireWorkspacePath(workspace: WorkspaceRef): string {
  if (!workspace.path) {
    throw new Error('目录访问权限已过期，请重新选择数据目录');
  }
  return workspace.path;
}

async function joinWorkspacePath(workspace: WorkspaceRef, relativePath: string): Promise<string> {
  assertSafeRelativePath(relativePath);
  const { join } = await import('@tauri-apps/api/path');
  return await join(requireWorkspacePath(workspace), normalizeRelativePath(relativePath));
}

async function entryFromPath(workspace: WorkspaceRef, relativePath: string): Promise<FileEntry> {
  const { stat } = await import('@tauri-apps/plugin-fs');
  const fullPath = await joinWorkspacePath(workspace, relativePath);
  const metadata = await stat(fullPath);
  const normalized = normalizeRelativePath(relativePath);
  const parts = normalized.split('/');
  return {
    name: parts[parts.length - 1],
    path: normalized,
    size: Number(metadata.size ?? 0),
    modifiedAt: metadata.mtime ? new Date(metadata.mtime) : new Date(),
  };
}

async function readDirectoryRecursive(
  workspace: WorkspaceRef,
  relativePath: string,
  extensions: string[],
  options: { includeHiddenDirectories?: boolean }
): Promise<FileEntry[]> {
  const { readDir } = await import('@tauri-apps/plugin-fs');
  const fullPath = relativePath ? await joinWorkspacePath(workspace, relativePath) : requireWorkspacePath(workspace);
  const entries = await readDir(fullPath);
  const files: FileEntry[] = [];

  for (const entry of entries) {
    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      if (options.includeHiddenDirectories || !entry.name.startsWith('.')) {
        files.push(...await readDirectoryRecursive(workspace, entryPath, extensions, options));
      }
    } else if (extensions.some((extension) => entry.name.toLowerCase().endsWith(extension))) {
      files.push(await entryFromPath(workspace, entryPath));
    }
  }

  return files;
}

export const tauriFileRepository: FileRepository = {
  isSupported: isTauriRuntime,
  async selectDirectory() {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected !== 'string') {
      return null;
    }

    const workspace: WorkspaceRef = {
      id: `desktop:${selected}`,
      name: nameFromPath(selected),
      platform: 'desktop',
      path: selected,
    };

    const store = await loadStore();
    await store.set(WORKSPACE_KEY, workspace);
    await store.save();
    return workspace;
  },
  async restoreDirectory() {
    if (!isTauriRuntime()) {
      return null;
    }
    const store = await loadStore();
    const workspace = await store.get<WorkspaceRef>(WORKSPACE_KEY);
    return workspace ?? null;
  },
  async verifyPermission(workspace) {
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      return await exists(requireWorkspacePath(workspace));
    } catch {
      return false;
    }
  },
  async clearSavedWorkspace() {
    const store = await loadStore();
    await store.delete(WORKSPACE_KEY);
    await store.save();
  },
  async listFiles(workspace, extensions, options = {}) {
    return await readDirectoryRecursive(workspace, '', extensions, options);
  },
  async readText(workspace, path) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return await readTextFile(await joinWorkspacePath(workspace, path));
  },
  async writeText(workspace, path, content) {
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const normalized = normalizeRelativePath(path);
    const parentParts = normalized.split('/').slice(0, -1);
    if (parentParts.length > 0) {
      await mkdir(await joinWorkspacePath(workspace, parentParts.join('/')), { recursive: true });
    }
    await writeTextFile(await joinWorkspacePath(workspace, normalized), content);
    return await entryFromPath(workspace, normalized);
  },
  async exists(workspace, path) {
    const { exists } = await import('@tauri-apps/plugin-fs');
    return await exists(await joinWorkspacePath(workspace, path));
  },
  async move(workspace, from, to) {
    const { rename } = await import('@tauri-apps/plugin-fs');
    await rename(await joinWorkspacePath(workspace, from), await joinWorkspacePath(workspace, to));
  },
  async mkdir(workspace, path) {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    await mkdir(await joinWorkspacePath(workspace, path), { recursive: true });
  },
  async remove(workspace, path) {
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(await joinWorkspacePath(workspace, path));
  },
};
```

- [ ] **Step 2: Select repository by runtime**

Modify `src/services/fileRepository/index.ts`:

```ts
import { tauriFileRepository } from './tauriFileRepository';
import { webFileRepository } from './webFileRepository';

export type { FileRepository } from './types';
export { createFakeFileRepository, createFakeWorkspace } from './fakeFileRepository';
export { tauriFileRepository } from './tauriFileRepository';
export { webFileRepository } from './webFileRepository';

export const fileRepository =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    ? tauriFileRepository
    : webFileRepository;
```

- [ ] **Step 3: Tighten capabilities after adapter works**

In `src-tauri/capabilities/default.json`, keep dialog, fs, and store permissions required by the adapter. Do not add shell, http, or process permissions for this milestone.

- [ ] **Step 4: Run Web verification**

Run:

```bash
npm run test -- --run
npm run type-check
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run desktop smoke test**

Run:

```bash
npm run tauri:dev
```

Expected: Tauri window opens, directory selection works, prompts load from a local Markdown folder, and creating a prompt writes a `.md` file to that folder. Stop the dev process after testing.

- [ ] **Step 6: Commit**

```bash
git add src/services/fileRepository/tauriFileRepository.ts src/services/fileRepository/index.ts src-tauri/capabilities/default.json
git commit -m "feat: add tauri file repository adapter"
```

---

### Task 12: Final Regression And Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/PromptClip-Desktop-Multiplatform-Design.md`

- [ ] **Step 1: Scan for platform leaks**

Run:

```bash
rg -n "FileSystemDirectoryHandle|FileSystemFileHandle|directoryHandle|fileHandle" src
```

Expected: Matches only in:

```text
src/vite-env.d.ts
src/services/fileRepository/webFileRepository.ts
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run test -- --run
npm run type-check
npm run lint
npm run build
npm run tauri:build
```

Expected: All commands PASS on macOS. Windows `npm run tauri:build` must be run on a Windows machine or CI runner before declaring Windows packaging complete.

- [ ] **Step 3: Manual Web regression**

In Chrome or Edge:

1. Start Web dev server with `npm run dev`.
2. Open `http://localhost:5173`.
3. Select a local PromptClip data directory.
4. Verify existing `.md` files load.
5. Create a prompt and confirm a Markdown file appears in the selected directory.
6. Edit title/content/tags and confirm the file updates.
7. Delete the prompt and confirm it moves into `.trash/`.
8. Pin a tag and confirm `.promptclip.json` updates.

- [ ] **Step 4: Manual desktop regression**

In Tauri dev mode:

1. Start desktop app with `npm run tauri:dev`.
2. Select the same PromptClip data directory used by Web.
3. Verify prompts load with the same titles, content, tags, pinned state, and copy counts.
4. Create, edit, delete, pin, and copy a prompt.
5. Quit and restart the app.
6. Confirm the last workspace restores.

- [ ] **Step 5: Update README commands**

Add desktop commands to `README.md`:

````md
```bash
npm run tauri:dev      # 启动桌面端开发环境
npm run tauri:build    # 构建桌面端安装包
```
````

Add a desktop note:

```md
桌面版使用 Tauri 2 访问用户选择的本地目录。Web 版仍使用 File System Access API，推荐 Chrome 或 Edge。
```

- [ ] **Step 6: Update design status**

At the top of `docs/PromptClip-Desktop-Multiplatform-Design.md`, add:

```md
> Implementation status: file repository abstraction and Tauri desktop support implemented according to `docs/superpowers/plans/2026-05-17-desktop-multiplatform.md`.
```

- [ ] **Step 7: Commit**

```bash
git add README.md docs/PromptClip-Desktop-Multiplatform-Design.md
git commit -m "docs: document desktop build workflow"
```

---

## Self-Review Checklist

- Spec coverage: This plan covers file abstraction, prompt type migration, Web adapter, Tauri scaffold, desktop adapter, export save handling, tests, Web regression, and desktop regression from `docs/PromptClip-Desktop-Multiplatform-Design.md`.
- Scope: The plan intentionally does not include file watching, auto update, signing, tray, global shortcuts, SQLite, or search index persistence.
- Type consistency: The shared signatures use `FileRepository`, `WorkspaceRef`, `FileEntry`, and `Prompt.filePath` throughout.
- Verification: Each code-changing task includes a test, type check, build check, or manual regression step.
