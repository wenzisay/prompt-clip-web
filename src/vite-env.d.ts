/// <reference types="vite/client" />

declare module '*.css' {
  const content: { className: string };
  export default content;
}

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

// File System Access API 类型
interface FileSystemHandlePermissionDescriptor {
  mode: 'read' | 'readwrite';
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob | BufferSource | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface ShowDirectoryPickerOptions {
  mode?: 'read' | 'readwrite';
  startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface Window {
  showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

type PermissionState = 'granted' | 'denied' | 'prompt';

type WriteParams = {
  type: 'write' | 'seek' | 'truncate';
  data?: Blob | BufferSource;
  position?: number;
  size?: number;
};
