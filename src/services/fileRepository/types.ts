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
