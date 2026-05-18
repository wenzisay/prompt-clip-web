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
