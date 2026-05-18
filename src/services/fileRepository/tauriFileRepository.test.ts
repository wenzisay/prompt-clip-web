import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceRef } from '@/types/file';
import { isTauriRuntime, tauriFileRepository } from './tauriFileRepository';

type StoreValue = unknown;

interface FakeStore {
  set: (key: string, value: StoreValue) => Promise<void>;
  get: (key: string) => Promise<StoreValue | undefined>;
  delete: (key: string) => Promise<boolean>;
  save: () => Promise<void>;
}

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  stat: vi.fn(),
  writeTextFile: vi.fn(),
  StoreLoad: vi.fn(),
  invoke: vi.fn(),
  join: vi.fn(async (...parts: string[]) => parts.join('/')),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mocks.open,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: mocks.exists,
  mkdir: mocks.mkdir,
  readDir: mocks.readDir,
  readTextFile: mocks.readTextFile,
  remove: mocks.remove,
  rename: mocks.rename,
  stat: mocks.stat,
  writeTextFile: mocks.writeTextFile,
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: mocks.StoreLoad,
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

vi.mock('@tauri-apps/api/path', () => ({
  join: mocks.join,
}));

const workspace: WorkspaceRef = {
  id: 'desktop:/Users/wenzi/Prompts',
  name: 'Prompts',
  platform: 'desktop',
  path: '/Users/wenzi/Prompts',
};

function installTauriWindow(): void {
  vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
}

function createStore(savedValue?: StoreValue): FakeStore {
  return {
    set: vi.fn(async () => undefined),
    get: vi.fn(async () => savedValue),
    delete: vi.fn(async () => true),
    save: vi.fn(async () => undefined),
  };
}

describe('tauriFileRepository', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('detects Tauri runtime from window internals', () => {
    expect(isTauriRuntime()).toBe(false);

    installTauriWindow();

    expect(isTauriRuntime()).toBe(true);
    expect(tauriFileRepository.isSupported()).toBe(true);
  });

  it('stores selected workspace from the native directory dialog', async () => {
    installTauriWindow();
    const store = createStore();
    mocks.StoreLoad.mockResolvedValue(store);
    mocks.open.mockResolvedValue('/Users/wenzi/Prompts');

    await expect(tauriFileRepository.selectDirectory()).resolves.toEqual(workspace);

    expect(mocks.open).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
      recursive: true,
    });
    expect(mocks.StoreLoad).toHaveBeenCalledWith('promptclip-workspace.json');
    expect(store.set).toHaveBeenCalledWith('workspace', workspace);
    expect(store.save).toHaveBeenCalled();
  });

  it('returns restored workspace only inside the Tauri runtime', async () => {
    const store = createStore(workspace);
    mocks.StoreLoad.mockResolvedValue(store);

    await expect(tauriFileRepository.restoreDirectory()).resolves.toBeNull();
    expect(mocks.StoreLoad).not.toHaveBeenCalled();

    installTauriWindow();

    await expect(tauriFileRepository.restoreDirectory()).resolves.toEqual(workspace);
  });

  it('recursively lists matching files and skips hidden directories by default', async () => {
    mocks.invoke.mockResolvedValue([
      {
        name: 'child.MD',
        path: 'visible/child.MD',
        size: 20,
        modifiedAt: 0,
      },
      {
        name: 'root.md',
        path: 'root.md',
        size: 10,
        modifiedAt: new Date('2026-01-01T00:00:00.000Z').getTime(),
      },
    ]);

    const files = await tauriFileRepository.listFiles(workspace, ['.md']);

    expect(files).toEqual([
      {
        name: 'child.MD',
        path: 'visible/child.MD',
        size: 20,
        modifiedAt: new Date(0),
      },
      {
        name: 'root.md',
        path: 'root.md',
        size: 10,
        modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    expect(mocks.invoke).toHaveBeenCalledWith('workspace_list_files', {
      root: workspace.path,
      extensions: ['.md'],
      includeHiddenDirectories: false,
    });
    expect(mocks.readDir).not.toHaveBeenCalled();
  });

  it('creates parent directories before writing text', async () => {
    mocks.invoke.mockResolvedValue({
      name: 'new.md',
      path: 'folder/new.md',
      size: 7,
      modifiedAt: new Date('2026-01-02T00:00:00.000Z').getTime(),
    });

    await expect(
      tauriFileRepository.writeText(workspace, 'folder/new.md', 'content')
    ).resolves.toEqual({
      name: 'new.md',
      path: 'folder/new.md',
      size: 7,
      modifiedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    expect(mocks.invoke).toHaveBeenCalledWith('workspace_write_text', {
      root: workspace.path,
      path: 'folder/new.md',
      content: 'content',
    });
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });

  it('uses native file commands for workspace dotfiles', async () => {
    mocks.invoke.mockImplementation(async (command: string) => {
      if (command === 'workspace_exists') {
        return true;
      }
      if (command === 'workspace_read_text') {
        return '{"pinnedTags":["ai"]}';
      }
      if (command === 'workspace_write_text') {
        return {
          name: '.promptclip.json',
          path: '.promptclip.json',
          size: 22,
          modifiedAt: new Date('2026-01-03T00:00:00.000Z').getTime(),
        };
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    await expect(tauriFileRepository.exists(workspace, '.promptclip.json')).resolves.toBe(true);
    await expect(
      tauriFileRepository.readText(workspace, '.promptclip.json')
    ).resolves.toBe('{"pinnedTags":["ai"]}');
    await expect(
      tauriFileRepository.writeText(workspace, '.promptclip.json', '{"pinnedTags":["ai"]}')
    ).resolves.toEqual({
      name: '.promptclip.json',
      path: '.promptclip.json',
      size: 22,
      modifiedAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    expect(mocks.invoke).toHaveBeenCalledWith('workspace_exists', {
      root: workspace.path,
      path: '.promptclip.json',
    });
    expect(mocks.invoke).toHaveBeenCalledWith('workspace_read_text', {
      root: workspace.path,
      path: '.promptclip.json',
    });
    expect(mocks.invoke).toHaveBeenCalledWith('workspace_write_text', {
      root: workspace.path,
      path: '.promptclip.json',
      content: '{"pinnedTags":["ai"]}',
    });
    expect(mocks.exists).not.toHaveBeenCalledWith(`${workspace.path}/.promptclip.json`);
    expect(mocks.readTextFile).not.toHaveBeenCalledWith(`${workspace.path}/.promptclip.json`);
    expect(mocks.writeTextFile).not.toHaveBeenCalledWith(
      `${workspace.path}/.promptclip.json`,
      '{"pinnedTags":["ai"]}'
    );
  });

  it('guards file operations without a workspace path and unsafe relative paths', async () => {
    const missingPath = { id: 'desktop:', name: 'Missing', platform: 'desktop' } satisfies WorkspaceRef;

    await expect(tauriFileRepository.readText(missingPath, 'a.md')).rejects.toThrow(
      '目录访问权限已过期，请重新选择数据目录'
    );
    await expect(tauriFileRepository.exists(missingPath, 'a.md')).rejects.toThrow(
      '目录访问权限已过期，请重新选择数据目录'
    );
    await expect(tauriFileRepository.readText(workspace, '../outside.md')).rejects.toThrow(
      '文件路径不合法'
    );
    expect(mocks.readTextFile).not.toHaveBeenCalled();
  });

  it('does not rename when normalized move paths are equal', async () => {
    await tauriFileRepository.move(workspace, 'folder//a.md', 'folder/a.md');

    expect(mocks.rename).not.toHaveBeenCalled();
  });
});
