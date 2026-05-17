/**
 * Prompt 加载 Hook
 *
 * 当目录授权后自动加载 Prompts
 */

import { useEffect } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';
import { PromptService } from '@/services/promptService';

export function usePromptLoader() {
  const { directoryHandle, isAuthorized } = useFileStore();
  const { setPrompts, setLoading: setPromptLoading, setError } = usePromptStore();
  const { loadPinnedTags, setTags } = useTagStore();

  useEffect(() => {
    // 如果未授权或没有目录句柄，不加载
    if (!isAuthorized || !directoryHandle) {
      return;
    }

    const load = async () => {
      setPromptLoading(true);
      setError(null);

      try {
        await loadPinnedTags(directoryHandle);

        // 加载所有 Prompts
        const prompts = await PromptService.loadPrompts(directoryHandle);
        await setPrompts(prompts);

        // 更新标签存储，保留重复项用于统计每个标签的 Prompt 数量
        setTags(prompts.flatMap((prompt) => prompt.tags));
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载 Prompts 失败';
        setError(message);
        console.error('Failed to load prompts:', error);
      } finally {
        setPromptLoading(false);
      }
    };

    load();
  }, [directoryHandle, isAuthorized, loadPinnedTags, setError, setPromptLoading, setPrompts, setTags]);
}
