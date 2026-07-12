import type { FileRepository } from '@/services/fileRepository';
import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';
import { createPollingWorkspaceChangeSource } from './pollingWorkspaceChangeSource';
import { createTauriWorkspaceChangeSource } from './tauriWorkspaceChangeSource';
import type { WorkspaceChangeSource } from './types';

export function createWorkspaceChangeSource(
  repository: FileRepository
): WorkspaceChangeSource {
  return isTauriRuntime()
    ? createTauriWorkspaceChangeSource(repository)
    : createPollingWorkspaceChangeSource(repository);
}
