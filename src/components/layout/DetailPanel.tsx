import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { SideDrawer } from '@/components/common';
import { PromptContent } from '@/components/prompt';
import { countChars } from '@/utils/markdown';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';

export function DetailPanel() {
  const { isDetailOpen, selectedPromptId, toggleDetail, openModal } = useUIStore();
  const { prompts, updatePrompt } = usePromptStore();
  const { workspace } = useFileStore();
  const [copied, setCopied] = useState(false);

  // 获取选中的 Prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  // 复制内容到剪贴板
  const handleCopy = async () => {
    if (!selectedPrompt) return;

    try {
      await navigator.clipboard.writeText(selectedPrompt.content);
      if (workspace) {
        const updated = await PromptService.incrementCopyCount(fileRepository, workspace, selectedPrompt);
        updatePrompt(updated);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 切换收藏
  const handleTogglePin = async () => {
    if (!selectedPrompt || !workspace) return;
    const updated = await PromptService.togglePinned(fileRepository, workspace, selectedPrompt);
    updatePrompt(updated);
  };

  // 打开编辑模态框
  const handleEdit = () => {
    if (!selectedPrompt) return;
    openModal('edit');
  };

  if (!selectedPrompt) {
    return (
      <SideDrawer
        isOpen={isDetailOpen}
        title="详情面板"
        onClose={() => toggleDetail(false)}
      >
        <p className="text-muted">未选择 Prompt</p>
      </SideDrawer>
    );
  }

  return (
    <SideDrawer
      isOpen={isDetailOpen}
      title={selectedPrompt.title}
      onClose={() => toggleDetail(false)}
      bodyClassName="p-0"
      header={
        <div className="h-14 shrink-0 flex items-center justify-between border-b border-border px-4">
          <button
            type="button"
            onClick={() => toggleDetail(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-fg"
            aria-label="关闭"
            title="关闭"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 text-sm font-medium text-fg shadow-card transition-colors hover:bg-surface-dim"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
              编辑
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white shadow-card transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-xl">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
      }
    >
      <article className="px-6 pb-10 pt-6">
        <h1 className="mb-3 text-xl font-semibold leading-tight tracking-normal text-fg">
          {selectedPrompt.title}
        </h1>

        {/* 标签 */}
        {selectedPrompt.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {selectedPrompt.tags.map((tag, index) => (
              <span
                key={tag}
                className={`
                  inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium
                  ${index % 2 === 0 ? 'bg-blue-50 text-accent' : 'bg-purple-50 text-tertiary'}
                `}
              >
                {tag.replace(/^#/, '')}
              </span>
            ))}
          </div>
        )}

        {/* 元数据 */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-5 text-xs leading-none text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">description</span>
            {countChars(selectedPrompt.content)} 字符
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">schedule</span>
            使用 {selectedPrompt.copyCount} 次
          </span>
          <button
            type="button"
            onClick={handleTogglePin}
            className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-fg"
            aria-label={selectedPrompt.pinned ? '取消收藏' : '收藏'}
            title={selectedPrompt.pinned ? '取消收藏' : '收藏'}
          >
            <span
              className={`
                material-symbols-outlined text-lg
                ${selectedPrompt.pinned ? 'text-yellow-500' : 'text-muted'}
              `}
            >
              {selectedPrompt.pinned ? 'star' : 'star_border'}
            </span>
            {selectedPrompt.pinned ? '已收藏' : '未收藏'}
          </button>
        </div>

        {/* Markdown 内容 */}
        <PromptContent
          content={selectedPrompt.content}
          className="prompt-detail-content"
        />
      </article>
    </SideDrawer>
  );
}
