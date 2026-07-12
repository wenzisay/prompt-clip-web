import type { WorkspaceRef } from '@/types/file';

export type WorkspaceFileChangeKind = 'created' | 'modified' | 'deleted';

export interface WorkspaceFileChange {
  kind: WorkspaceFileChangeKind;
  path: string;
  detectedAt: Date;
}

export type WorkspaceChangeSourceKind = 'native-watch' | 'poll' | 'focus-scan';

export interface WorkspaceChangeBatch {
  workspaceId: string;
  changes: WorkspaceFileChange[];
  source: WorkspaceChangeSourceKind;
}

export type StopWorkspaceWatching = () => void;

export interface WorkspaceChangeSource {
  start(
    workspace: WorkspaceRef,
    onChange: (batch: WorkspaceChangeBatch) => void
  ): Promise<StopWorkspaceWatching>;
}
