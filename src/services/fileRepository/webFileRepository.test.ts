import { afterEach, describe, expect, it } from 'vitest';
import { webFileRepository } from './webFileRepository';

type RequestHandler<T> = (this: IDBRequest<T>, ev: Event) => unknown;

interface MutableRequest<T> extends IDBRequest<T> {
  result: T;
  error: DOMException | null;
  onsuccess: RequestHandler<T> | null;
  onerror: RequestHandler<T> | null;
  onupgradeneeded?: RequestHandler<T> | null;
}

class FakeFileHandle implements FileSystemFileHandle {
  readonly kind = 'file';

  constructor(
    readonly name: string,
    private readonly entryId: string,
    private readonly read: () => string,
    private readonly writeContent: (content: string) => void
  ) {}

  async getFile(): Promise<File> {
    const content = this.read();
    return {
      name: this.name,
      size: new Blob([content]).size,
      lastModified: 0,
      text: async () => content,
    } as File;
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    let content = '';

    return {
      write: async (data: Blob | BufferSource | WriteParams) => {
        content = typeof data === 'string' ? data : String(data);
      },
      close: async () => {
        this.writeContent(content);
      },
    } as FileSystemWritableFileStream;
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other instanceof FakeFileHandle && this.entryId === other.entryId;
  }

  async queryPermission(): Promise<PermissionState> {
    return 'granted';
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted';
  }
}

class FakeDirectoryHandle implements FileSystemDirectoryHandle {
  readonly kind = 'directory';
  private readonly files = new Map<string, string>();

  constructor(readonly name: string) {}

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
    const key = name.toLowerCase();

    if (!this.files.has(key)) {
      if (!options?.create) {
        throw new DOMException('Not found', 'NotFoundError');
      }
      this.files.set(key, '');
    }

    return new FakeFileHandle(
      name,
      key,
      () => this.files.get(key) ?? '',
      (content) => this.files.set(key, content)
    );
  }

  async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    throw new DOMException('Not found', 'NotFoundError');
  }

  async removeEntry(name: string): Promise<void> {
    this.files.delete(name.toLowerCase());
  }

  async resolve(): Promise<string[] | null> {
    return null;
  }

  async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    for (const fileName of this.files.keys()) {
      yield [fileName, await this.getFileHandle(fileName)];
    }
  }

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for (const fileName of this.files.keys()) {
      yield await this.getFileHandle(fileName);
    }
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return this === other;
  }

  async queryPermission(): Promise<PermissionState> {
    return 'granted';
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted';
  }
}

class FakeIndexedDB {
  private readonly data = new Map<IDBValidKey, unknown>();
  private readonly pendingCompletes: Array<() => void> = [];

  constructor(private readonly autoComplete: boolean) {}

  open(): IDBOpenDBRequest {
    const request = this.createRequest<IDBDatabase>();
    const database = {
      createObjectStore: () => undefined,
      close: () => undefined,
      transaction: () => this.createTransaction(),
    } as unknown as IDBDatabase;

    queueMicrotask(() => {
      request.result = database;
      request.onupgradeneeded?.call(request, new Event('upgradeneeded'));
      request.onsuccess?.call(request, new Event('success'));
    });

    return request as IDBOpenDBRequest;
  }

  completePendingTransaction(): void {
    this.pendingCompletes.shift()?.();
  }

  getPendingTransactionCount(): number {
    return this.pendingCompletes.length;
  }

  private createTransaction(): IDBTransaction {
    const pendingWrites: Array<() => void> = [];
    const transaction = {
      objectStore: () => this.createObjectStore(pendingWrites),
      oncomplete: null,
      onerror: null,
      onabort: null,
    } as unknown as IDBTransaction;

    const complete = () => {
      pendingWrites.forEach((write) => write());
      transaction.oncomplete?.call(transaction, new Event('complete'));
    };

    if (this.autoComplete) {
      queueMicrotask(complete);
    } else {
      this.pendingCompletes.push(complete);
    }

    return transaction;
  }

  private createObjectStore(pendingWrites: Array<() => void>): IDBObjectStore {
    return {
      get: (key: IDBValidKey) => {
        const request = this.createRequest<unknown>();
        queueMicrotask(() => {
          request.result = this.data.get(key);
          request.onsuccess?.call(request, new Event('success'));
        });
        return request;
      },
      put: (value: unknown, key: IDBValidKey) => {
        const request = this.createRequest<IDBValidKey>();
        pendingWrites.push(() => this.data.set(key, value));
        queueMicrotask(() => {
          request.result = key;
          request.onsuccess?.call(request, new Event('success'));
        });
        return request;
      },
      delete: (key: IDBValidKey) => {
        const request = this.createRequest<undefined>();
        pendingWrites.push(() => this.data.delete(key));
        queueMicrotask(() => {
          request.result = undefined;
          request.onsuccess?.call(request, new Event('success'));
        });
        return request;
      },
    } as IDBObjectStore;
  }

  private createRequest<T>(): MutableRequest<T> {
    return {
      result: undefined as T,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    } as MutableRequest<T>;
  }
}

function installWindow(
  directory: FileSystemDirectoryHandle,
  indexedDB: FakeIndexedDB,
  onShowDirectoryPicker?: (options?: ShowDirectoryPickerOptions) => void
): void {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      indexedDB,
      showDirectoryPicker: async (options?: ShowDirectoryPickerOptions) => {
        onShowDirectoryPicker?.(options);
        return directory;
      },
    },
  });
}

function waitForMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

async function waitForPendingTransaction(indexedDB: FakeIndexedDB): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (indexedDB.getPendingTransactionCount() > 0) {
      return;
    }
    await waitForMicrotasks();
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('webFileRepository', () => {
  it('does not delete a file when moving to the same normalized path', async () => {
    const directory = new FakeDirectoryHandle('Prompts');
    installWindow(directory, new FakeIndexedDB(true));

    const workspace = await webFileRepository.selectDirectory();
    expect(workspace).not.toBeNull();

    await webFileRepository.writeText(workspace!, 'a.md', 'content');
    await webFileRepository.move(workspace!, 'a.md', 'a.md');

    await expect(webFileRepository.readText(workspace!, 'a.md')).resolves.toBe('content');
  });

  it('does not delete a file when moving to a different path string for the same entry', async () => {
    const directory = new FakeDirectoryHandle('Prompts');
    installWindow(directory, new FakeIndexedDB(true));

    const workspace = await webFileRepository.selectDirectory();
    expect(workspace).not.toBeNull();

    await webFileRepository.writeText(workspace!, 'a.md', 'content');
    await webFileRepository.move(workspace!, 'a.md', 'A.md');

    await expect(webFileRepository.readText(workspace!, 'a.md')).resolves.toBe('content');
  });

  it('waits for IndexedDB write transactions to complete before selectDirectory resolves', async () => {
    const indexedDB = new FakeIndexedDB(false);
    installWindow(new FakeDirectoryHandle('Prompts'), indexedDB);

    let resolved = false;
    const selected = webFileRepository.selectDirectory().then((workspace) => {
      resolved = true;
      return workspace;
    });

    await waitForPendingTransaction(indexedDB);
    expect(resolved).toBe(false);

    indexedDB.completePendingTransaction();
    await waitForPendingTransaction(indexedDB);
    expect(resolved).toBe(false);

    indexedDB.completePendingTransaction();

    await expect(selected).resolves.toMatchObject({
      id: 'web:Prompts',
      handleKey: 'directory',
    });
    expect(resolved).toBe(true);
  });

  it('starts the directory picker in the previously saved directory when available', async () => {
    const firstDirectory = new FakeDirectoryHandle('First');
    const secondDirectory = new FakeDirectoryHandle('Second');
    const indexedDB = new FakeIndexedDB(true);
    const pickerOptions: ShowDirectoryPickerOptions[] = [];

    installWindow(firstDirectory, indexedDB, (options) => {
      if (options) {
        pickerOptions.push(options);
      }
    });
    await webFileRepository.selectDirectory();

    installWindow(secondDirectory, indexedDB, (options) => {
      if (options) {
        pickerOptions.push(options);
      }
    });
    await webFileRepository.selectDirectory();

    expect(pickerOptions[1]).toMatchObject({
      mode: 'readwrite',
      startIn: firstDirectory,
      id: 'promptclip-workspace',
    });
  });
});
