import type { FileRepository } from '@/services/fileRepository';
import type { WorkspaceRef } from '@/types/file';

export type BackupTargetKind = 'webdav';

export interface BackupManifestFile {
  size: number;
  modifiedAt: string;
  sha256: string;
}

export interface BackupManifest {
  schemaVersion: 1;
  backupId: string;
  sourceWorkspaceId: string;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
  files: Record<string, BackupManifestFile>;
}

export interface BackupTarget {
  readonly id: string;
  readonly kind: BackupTargetKind;
  listRoot(): Promise<string[]>;
  readManifest(): Promise<BackupManifest | null>;
  upload(path: string, content: Uint8Array): Promise<void>;
  download(path: string): Promise<Uint8Array>;
  delete(path: string): Promise<void>;
  commitManifest(manifest: BackupManifest): Promise<void>;
}

export interface BackupHashCacheEntry extends BackupManifestFile {
  path: string;
}

export interface BackupHashCache {
  load(): Promise<BackupHashCacheEntry[]>;
  save(entries: BackupHashCacheEntry[]): Promise<void>;
}

export interface BackupResult {
  uploaded: number;
  deleted: number;
  unchanged: number;
  totalBytesUploaded: number;
  completedAt: string;
}

export interface RestoreResult {
  restored: number;
  unchanged: number;
  skipped: number;
  completedAt: string;
}

export interface RestoreOptions {
  skipPaths?: ReadonlySet<string>;
}

export interface BackupOperationContext {
  repository: FileRepository;
  workspace: WorkspaceRef;
  target: BackupTarget;
}

export type BackupErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'PERMISSION_DENIED'
  | 'TARGET_NOT_EMPTY'
  | 'MANIFEST_INVALID'
  | 'MANIFEST_UNSUPPORTED'
  | 'CAPABILITY_UNSUPPORTED'
  | 'UPLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'RESTORE_TARGET_NOT_EMPTY';

export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode, message: string = code) {
    super(message);
    this.name = 'BackupError';
  }
}
