/**
 * 启动后台分批加载 prompt content 的 hook
 *
 * 在 prompts 数组就绪后挂载该 hook，组件卸载或 workspace 变化时自动取消。
 */

import { useEffect } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { fileRepository } from '@/services/fileRepository';
import { startLazyContentLoad } from '@/services/promptLazyLoader';

export function usePromptLazyLoad(): void {
  const { workspace } = useFileStore();
  const { prompts } = usePromptStore();

  useEffect(() => {
    if (!workspace) {
      return;
    }
    const targets = prompts.filter((prompt) => !prompt.isContentLoaded);
    if (targets.length === 0) {
      return;
    }
    const handle = startLazyContentLoad(targets, {
      repository: fileRepository,
      workspace,
    });
    return () => {
      handle.cancel();
    };
  }, [workspace, prompts]);
}
