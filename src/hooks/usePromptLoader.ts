/**
 * Prompt 加载 Hook
 *
 * 当目录授权后自动加载 Prompts
 */

import { useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import { cancelLazyContentLoad } from '@/services/promptLazyLoader';
import { WorkspaceIntegrityService } from '@/services/workspaceIntegrityService';
import { MetadataRepairService } from '@/services/metadataRepairService';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';

export function usePromptLoader() {
  const { t } = useTranslation();
  const { workspace, isAuthorized } = useFileStore();
  const { setPrompts, setLoading: setPromptLoading, setError, clearPrompts } = usePromptStore();
  const { loadPinnedTags, clearTags } = useTagStore();

  useEffect(() => {
    // 如果未授权或没有工作区，不加载
    if (!isAuthorized || !workspace) {
      useMetadataRepairStore.getState().reset();
      clearPrompts();
      clearTags();
      cancelLazyContentLoad();
      return;
    }

    let isActive = true;

    const load = async () => {
      useMetadataRepairStore.getState().beginWorkspace(workspace.id);
      clearPrompts();
      clearTags();
      cancelLazyContentLoad();
      setPromptLoading(true);
      setError(null);

      try {
        await loadPinnedTags(workspace, () => isActive);
        if (!isActive) return;

        const integrity = await WorkspaceIntegrityService.repairPromptIds(
          fileRepository,
          workspace
        );
        if (!isActive) return;
        if (integrity.failures.length > 0) {
          console.error('Failed to repair some prompt ids:', integrity.failures);
        }

        // 阶段 1：head-only 加载（preview + frontmatter）
        const prompts = await PromptService.loadPrompts(fileRepository, workspace);
        if (!isActive) return;

        await setPrompts(prompts);
        if (!isActive) return;
        try {
          const metadataResult = await MetadataRepairService.scanPromptMetadata(
            fileRepository,
            workspace
          );
          if (!isActive) return;
          if (metadataResult.repairableFiles > 0) {
            useMetadataRepairStore.getState().show(metadataResult);
          }
        } catch (error) {
          console.error('Failed to scan prompt metadata:', error);
        }
        // 阶段 2：由 usePromptLazyLoad 在 prompts 就绪后启动后台 idle 加载
      } catch (error) {
        if (!isActive) return;

        const message = error instanceof Error ? error.message : t.app.loadPromptsFailed;
        setError(message);
        console.error('Failed to load prompts:', error);
      } finally {
        if (isActive) {
          setPromptLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
      cancelLazyContentLoad();
    };
  }, [
    workspace,
    isAuthorized,
    clearPrompts,
    clearTags,
    loadPinnedTags,
    setError,
    setPromptLoading,
    setPrompts,
    t.app.loadPromptsFailed,
  ]);
}
