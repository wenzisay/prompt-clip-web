/**
 * Prompt 网格组件
 */

import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { PromptCard } from './PromptCard';
import { Spinner } from '@/components/common';
import { PromptService } from '@/services/promptService';

interface PromptGridProps {
  /** 加载状态 */
  isLoading?: boolean;
}

export function PromptGrid({ isLoading = false }: PromptGridProps) {
  const { filteredPrompts, deletePrompt } = usePromptStore();
  const { selectedPromptIds, toggleSelectAll, clearSelection, openModal } = useUIStore();
  const { directoryHandle } = useFileStore();
  const selectedCount = selectedPromptIds.length;

  const handleBatchDelete = async () => {
    if (!directoryHandle || selectedPromptIds.length === 0) return;
    const confirmed = window.confirm(`确定要将 ${selectedPromptIds.length} 个 Prompt 移动到 .trash 吗？`);
    if (!confirmed) return;

    const selectedSet = new Set(selectedPromptIds);
    const promptsToDelete = filteredPrompts.filter((prompt) => selectedSet.has(prompt.id));

    for (const prompt of promptsToDelete) {
      await PromptService.deletePrompt(directoryHandle, prompt);
      deletePrompt(prompt.id);
    }

    clearSelection();
  };

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
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="sticky top-0 z-10 bg-surface border border-border rounded-card shadow-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-fg">已选择 {selectedCount} 个</span>
            <button
              onClick={() => toggleSelectAll(filteredPrompts.map((prompt) => prompt.id))}
              className="text-accent hover:underline"
            >
              全选/取消全选
            </button>
            <button onClick={clearSelection} className="text-muted hover:text-fg">
              清除
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('export')}
              className="px-3 py-1.5 text-sm text-fg rounded-lg hover:bg-surface-dim transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              导出
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:opacity-90 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              删除
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr))]">
        {filteredPrompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>
    </div>
  );
}
