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

export function usePromptLoader() {
  const { t } = useTranslation();
  const { workspace, isAuthorized } = useFileStore();
  const { setPrompts, setLoading: setPromptLoading, setError, clearPrompts } = usePromptStore();
  const { loadPinnedTags, clearTags } = useTagStore();

  useEffect(() => {
    // 如果未授权或没有工作区，不加载
    if (!isAuthorized || !workspace) {
      clearPrompts();
      clearTags();
      return;
    }

    let isActive = true;

    const load = async () => {
      clearPrompts();
      clearTags();
      setPromptLoading(true);
      setError(null);

      try {
        await loadPinnedTags(workspace, () => isActive);
        if (!isActive) return;

        // 加载所有 Prompts
        const prompts = await PromptService.loadPrompts(fileRepository, workspace);
        if (!isActive) return;

        await setPrompts(prompts);
        if (!isActive) return;
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
