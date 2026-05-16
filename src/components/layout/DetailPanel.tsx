/**
 * 详情面板组件
 */

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { Overlay } from '@/components/common';
import { IconButton } from '@/components/common';
import { TagPill } from '@/components/tag';
import { PromptContent } from '@/components/prompt';
import { formatDate } from '@/utils/date';
import { countChars } from '@/utils/markdown';

export function DetailPanel() {
  const { isDetailOpen, selectedPromptId, toggleDetail, openModal } = useUIStore();
  const { prompts, togglePinned } = usePromptStore();
  const [copied, setCopied] = useState(false);

  // 获取选中的 Prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  // ESC 键关闭
  useEffect(() => {
    if (!isDetailOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleDetail(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDetailOpen, toggleDetail]);

  // 滚动锁定
  useEffect(() => {
    if (!isDetailOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDetailOpen]);

  // 复制内容到剪贴板
  const handleCopy = async () => {
    if (!selectedPrompt) return;

    try {
      await navigator.clipboard.writeText(selectedPrompt.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 切换收藏
  const handleTogglePin = () => {
    if (!selectedPrompt) return;
    togglePinned(selectedPrompt.id);
  };

  // 打开编辑模态框
  const handleEdit = () => {
    if (!selectedPrompt) return;
    toggleDetail(false);
    openModal('edit');
  };

  if (!selectedPrompt) {
    return (
      <>
        <Overlay isOpen={isDetailOpen} onClose={() => toggleDetail(false)} blur />
        <div
          className={`
            fixed top-0 right-0 h-full w-detail bg-surface border-l border-border
            shadow-card-hover transform transition-transform duration-200 ease-out
            z-40 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
          aria-modal="true"
          role="dialog"
        >
          <div className="h-14 flex items-center justify-between px-4 border-b border-border">
            <h2 className="font-semibold text-fg">详情面板</h2>
            <button
              onClick={() => toggleDetail(false)}
              className="p-2 rounded-lg hover:bg-surface-dim"
              aria-label="关闭"
            >
              <span className="material-symbols-outlined text-muted">close</span>
            </button>
          </div>
          <div className="p-4">
            <p className="text-muted">未选择 Prompt</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Overlay isOpen={isDetailOpen} onClose={() => toggleDetail(false)} blur />

      <div
        className={`
          fixed top-0 right-0 h-full w-detail bg-surface border-l border-border
          shadow-card-hover transform transition-transform duration-200 ease-out
          z-40 ${isDetailOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-modal="true"
        role="dialog"
      >
        {/* 头部工具栏 */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <h2 className="font-semibold text-fg truncate flex-1">
            {selectedPrompt.title}
          </h2>
          <div className="flex items-center gap-1">
            <IconButton
              icon={selectedPrompt.pinned ? 'star' : 'star_border'}
              label={selectedPrompt.pinned ? '取消收藏' : '收藏'}
              onClick={handleTogglePin}
              size="sm"
              variant="ghost"
              filled={selectedPrompt.pinned}
              className={selectedPrompt.pinned ? 'text-yellow-500' : 'text-muted'}
            />
            <button
              onClick={() => toggleDetail(false)}
              className="p-2 rounded-lg hover:bg-surface-dim"
              aria-label="关闭"
            >
              <span className="material-symbols-outlined text-muted">close</span>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 标签 */}
          {selectedPrompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPrompt.tags.map((tag) => (
                <TagPill key={tag} label={tag.split('/').pop() || tag} />
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
        </div>

        {/* 底部操作栏 */}
        <div className="h-14 flex items-center justify-end gap-2 px-4 border-t border-border">
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
        </div>
      </div>
    </>
  );
}
