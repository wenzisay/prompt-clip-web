import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { IconButton, SideDrawer } from '@/components/common';
import { TagPill } from '@/components/tag';
import { PromptContent } from '@/components/prompt';
import { formatDate } from '@/utils/date';
import { countChars } from '@/utils/markdown';
import { PromptService } from '@/services/promptService';

export function DetailPanel() {
  const { isDetailOpen, selectedPromptId, toggleDetail, openModal } = useUIStore();
  const { prompts, updatePrompt } = usePromptStore();
  const { directoryHandle } = useFileStore();
  const [copied, setCopied] = useState(false);

  // 获取选中的 Prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  // 复制内容到剪贴板
  const handleCopy = async () => {
    if (!selectedPrompt) return;

    try {
      await navigator.clipboard.writeText(selectedPrompt.content);
      if (directoryHandle) {
        const updated = await PromptService.incrementCopyCount(directoryHandle, selectedPrompt);
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
    if (!selectedPrompt || !directoryHandle) return;
    const updated = await PromptService.togglePinned(directoryHandle, selectedPrompt);
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
      headerActions={
        <IconButton
          icon={selectedPrompt.pinned ? 'star' : 'star_border'}
          label={selectedPrompt.pinned ? '取消收藏' : '收藏'}
          onClick={handleTogglePin}
          size="sm"
          variant="ghost"
          filled={selectedPrompt.pinned}
          className={selectedPrompt.pinned ? 'text-yellow-500' : 'text-muted'}
        />
      }
      footer={
        <>
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium text-fg rounded-lg hover:bg-surface-dim transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            编辑
          </button>
        </>
      }
    >
          {/* 标签 */}
          {selectedPrompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPrompt.tags.map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
            </div>
          )}

          {/* 元数据 */}
          <div className="flex items-center gap-4 text-xs text-muted mb-6 pb-4 border-b border-border">
            <span>{countChars(selectedPrompt.content)} 字符</span>
            <span>复制 {selectedPrompt.copyCount} 次</span>
            <span>更新于 {formatDate(selectedPrompt.updatedAt)}</span>
          </div>

          {/* Markdown 内容 */}
          <PromptContent content={selectedPrompt.content} />
    </SideDrawer>
  );
}
