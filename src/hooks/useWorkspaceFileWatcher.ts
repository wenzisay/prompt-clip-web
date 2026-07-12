import { useEffect } from 'react';
import { fileRepository } from '@/services/fileRepository';
import { cancelLazyContentLoad } from '@/services/promptLazyLoader';
import { PromptService } from '@/services/promptService';
import { createWorkspaceChangeSource } from '@/services/workspaceChanges';
import type { WorkspaceChangeBatch } from '@/services/workspaceChanges';
import { WorkspaceIntegrityService } from '@/services/workspaceIntegrityService';
import { MetadataRepairService } from '@/services/metadataRepairService';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';

export function useWorkspaceFileWatcher(): void {
  const workspace = useFileStore((state) => state.workspace);
  const isAuthorized = useFileStore((state) => state.isAuthorized);
  const isEnabled = useSettingsStore((state) => state.fileWatchingEnabled);

  useEffect(() => {
    if (!isEnabled || !isAuthorized || !workspace) return;

    let isActive = true;
    let stopWatching: (() => void) | undefined;
    let isReloading = false;
    let hasPendingReload = false;
    const pendingCreatedPaths = new Set<string>();
    const source = createWorkspaceChangeSource(fileRepository);

    const reload = async (batch: WorkspaceChangeBatch): Promise<void> => {
      if (!isActive) return;
      for (const change of batch.changes) {
        if (change.kind === 'created') {
          pendingCreatedPaths.add(change.path);
        }
      }
      if (isReloading) {
        hasPendingReload = true;
        return;
      }

      isReloading = true;
      try {
        do {
          hasPendingReload = false;
          const newlyCreatedPaths = new Set(pendingCreatedPaths);
          pendingCreatedPaths.clear();
          cancelLazyContentLoad();
          const integrity = await WorkspaceIntegrityService.repairPromptIds(
            fileRepository,
            workspace,
            { newlyCreatedPaths }
          );
          if (integrity.failures.length > 0) {
            console.error('Failed to repair some prompt ids:', integrity.failures);
          }
          const prompts = await PromptService.loadPrompts(fileRepository, workspace);
          if (!isActive) return;

          await usePromptStore.getState().setPrompts(prompts);
          if (newlyCreatedPaths.size > 0) {
            try {
              const metadataResult = await MetadataRepairService.scanPromptMetadata(
                fileRepository,
                workspace,
                { paths: newlyCreatedPaths }
              );
              if (metadataResult.repairableFiles > 0) {
                useMetadataRepairStore.getState().show(metadataResult);
              }
            } catch (error) {
              console.error('Failed to scan new prompt metadata:', error);
            }
          }
          const selectedPromptId = useUIStore.getState().selectedPromptId;
          if (selectedPromptId && !prompts.some((prompt) => prompt.id === selectedPromptId)) {
            useUIStore.getState().setSelectedPrompt(null);
          }
        } while (hasPendingReload && isActive);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to reload workspace';
        usePromptStore.getState().setError(message);
        console.error('Failed to reload prompts after workspace change:', error);
      } finally {
        isReloading = false;
      }
    };

    void source
      .start(workspace, (batch) => {
        if (batch.workspaceId === workspace.id) {
          void reload(batch);
        }
      })
      .then((stop) => {
        if (isActive) {
          stopWatching = stop;
        } else {
          stop();
        }
      })
      .catch((error) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Failed to watch workspace';
        usePromptStore.getState().setError(message);
        console.error('Failed to start workspace watcher:', error);
      });

    return () => {
      isActive = false;
      stopWatching?.();
    };
  }, [isAuthorized, isEnabled, workspace]);
}
