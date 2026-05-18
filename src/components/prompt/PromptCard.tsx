/**
 * Prompt 卡片组件
 */

import type { Prompt } from '@/types/prompt';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { IconButton } from '@/components/common';
import { formatDate } from '@/utils/date';
import { useState, useRef, useEffect } from 'react';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';

interface PromptCardProps {
  /** Prompt 数据 */
  prompt: Prompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const { setSelectedPrompt, openModal, selectedPromptIds, toggleSelectPrompt } = useUIStore();
  const { updatePrompt } = usePromptStore();
  const { workspace } = useFileStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedPromptIds.includes(prompt.id);
  const isSelectionMode = selectedPromptIds.length > 0;

  // 获取预览文本（前两行）
  const previewText = prompt.content
    .split('\n')
    .slice(0, 2)
    .join(' ')
    .slice(0, 120);

  // 格式化日期
  const relativeDate = formatDate(prompt.updatedAt);

  // 点击卡片打开详情
  const handleClick = () => {
    setSelectedPrompt(prompt.id);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(prompt.content);
      if (workspace) {
        const updated = await PromptService.incrementCopyCount(fileRepository, workspace, prompt);
        updatePrompt(updated);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 切换收藏
  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!workspace) return;
    const updated = await PromptService.togglePinned(fileRepository, workspace, prompt);
    updatePrompt(updated);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelectPrompt(prompt.id);
  };

  const handleMenuSelect = (e: React.MouseEvent) => {
    handleSelect(e);
    setIsMenuOpen(false);
  };

  const handleMenuTogglePin = async (e: React.MouseEvent) => {
    await handleTogglePin(e);
    setIsMenuOpen(false);
  };

  // 打开菜单
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  // 编辑
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrompt(prompt.id);
    openModal('edit');
    setIsMenuOpen(false);
  };

  // 删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrompt(prompt.id);
    openModal('delete');
    setIsMenuOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div
      onClick={handleClick}
      className={`
        bg-surface rounded-card p-4 border
        hover:border-border hover:shadow-card-hover
        cursor-pointer transition-all duration-200
        group
        ${isSelected ? 'border-accent shadow-card-hover' : 'border-transparent'}
      `}
    >
      {/* 头部：标题和操作按钮 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-fg line-clamp-1 flex-1">
          {prompt.title}
        </h3>
        <div className="flex items-center gap-1">
          {isSelectionMode && (
            <button
              type="button"
              onClick={handleSelect}
              className={`
                w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors
                ${isSelected ? 'text-accent bg-accent-soft' : 'text-muted hover:bg-surface-dim'}
              `}
              aria-label={isSelected ? '取消选择' : '选择'}
              title={isSelected ? '取消选择' : '选择'}
            >
              <span className="material-symbols-outlined text-lg">
                {isSelected ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </button>
          )}
          {prompt.pinned && (
            <IconButton
              icon="star"
              label="取消收藏"
              onClick={handleTogglePin}
              size="sm"
              variant="ghost"
              filled
              className="text-yellow-500"
            />
          )}
          <div className="relative" ref={menuRef}>
            <IconButton
              icon="more_vert"
              label="更多操作"
              onClick={handleMenuClick}
              size="sm"
              variant="ghost"
            />
            {/* 下拉菜单 */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-surface border border-border rounded-lg shadow-card py-1 z-10">
                <button
                  onClick={handleMenuSelect}
                  className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  {isSelected ? '取消选择' : '选择'}
                </button>
                <button
                  onClick={handleMenuTogglePin}
                  className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">
                    {prompt.pinned ? 'star' : 'star_border'}
                  </span>
                  {prompt.pinned ? '取消收藏' : '收藏'}
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 预览文本 */}
      <p className="text-sm text-muted line-clamp-2 mb-3 min-h-[2.5rem]">
        {previewText}
        {previewText.length >= 120 && '...'}
      </p>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-5">
        {prompt.tags.length > 0 && (
          <>
            {prompt.tags.slice(0, 4).map((tag, index) => (
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
            {prompt.tags.length > 4 && (
              <span className="text-xs text-muted">
                +{prompt.tags.length - 4}
              </span>
            )}
          </>
        )}
      </div>

      {/* 底部：元数据 */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{relativeDate}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`
            w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors
            ${copied ? 'text-accent bg-accent-soft' : 'text-muted hover:bg-surface-dim hover:text-fg'}
          `}
          aria-label="复制 Prompt 内容"
          title={copied ? '已复制' : '复制'}
        >
          <span className="material-symbols-outlined text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
    </div>
  );
}
