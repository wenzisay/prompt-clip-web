/**
 * Prompt 网格组件
 */

import { usePromptStore } from '@/stores/promptStore';
import { PromptCard } from './PromptCard';
import { Spinner } from '@/components/common';

interface PromptGridProps {
  /** 加载状态 */
  isLoading?: boolean;
}

export function PromptGrid({ isLoading = false }: PromptGridProps) {
  const { filteredPrompts } = usePromptStore();

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // 空状态
  if (filteredPrompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="material-symbols-outlined text-6xl text-muted-light mb-4">
          search_off
        </span>
        <h3 className="text-lg font-medium text-fg mb-2">没有找到 Prompts</h3>
        <p className="text-muted text-sm max-w-md">
          尝试调整搜索条件或创建一个新的 Prompt
        </p>
      </div>
    );
  }

  // 网格
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredPrompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
}
