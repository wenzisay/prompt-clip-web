/**
 * Prompt 卡片组件
 */

import type { Prompt } from '@/types/prompt';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { TagPill } from '@/components/tag';
import { IconButton } from '@/components/common';
import { formatDate } from '@/utils/date';
import { useState, useRef, useEffect } from 'react';

interface PromptCardProps {
  /** Prompt 数据 */
  prompt: Prompt;
}

export function PromptCard({ prompt }: PromptCardProps) {
  const { setSelectedPrompt, openModal } = useUIStore();
  const { togglePinned } = usePromptStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 获取预览文本（前两行）
  const previewText = prompt.content
    .split('\n')
    .slice(0, 2)
    .join(' ')
    .slice(0, 120);

  // 格式化日期
  const relativeDate = formatDate(prompt.updatedAt);

  // 字符计数
  const charCount = prompt.content.length;

  // 点击卡片打开详情
  const handleClick = () => {
    setSelectedPrompt(prompt.id);
  };

  // 切换收藏
  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinned(prompt.id);
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
        bg-surface rounded-card p-4 border border-transparent
        hover:border-border hover:shadow-card-hover
        cursor-pointer transition-all duration-200
        group
      `}
    >
      {/* 头部：标题和操作按钮 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-fg line-clamp-1 flex-1">
          {prompt.title}
        </h3>
        <div className="flex items-center gap-1">
          <IconButton
            icon={prompt.pinned ? 'star' : 'star_border'}
            label={prompt.pinned ? '取消收藏' : '收藏'}
            onClick={handleTogglePin}
            size="sm"
            variant="ghost"
            filled={prompt.pinned}
            className={prompt.pinned ? 'text-yellow-500' : 'text-muted'}
          />
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
      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {prompt.tags.slice(0, 4).map((tag) => (
            <TagPill key={tag} label={tag.split('/').pop() || tag} />
          ))}
          {prompt.tags.length > 4 && (
            <span className="text-xs text-muted">
              +{prompt.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* 底部：元数据 */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{relativeDate}</span>
        <span>{charCount} 字符</span>
      </div>
    </div>
  );
}
