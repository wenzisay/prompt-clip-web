/**
 * Prompt 卡片组件
 */

import type { Prompt } from '@/types/prompt';
import type { WorkspaceRef } from '@/types/file';
import { messages, useTranslation, type Locale } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { IconButton } from '@/components/common';
import { formatDateTime } from '@/utils/date';
import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { PromptService } from '@/services/promptService';
import { fileRepository, type FileRepository } from '@/services/fileRepository';
import { getPromptPreview } from '@/utils/markdown';

interface PromptCardProps {
  /** Prompt 数据 */
  prompt: Prompt;
  /** 菜单打开状态变化 */
  onMenuOpenChange?: (promptId: string | null) => void;
}

export interface CopyPromptOptions {
  prompt: Prompt;
  workspace: WorkspaceRef | null;
  repository?: FileRepository;
  onCopied?: () => void;
}

/**
 * 将 prompt 的正文复制到剪贴板，必要时先调用 ensureContent 补全。
 * - 复制成功后递增 copyCount 并把更新写回 store
 * - 抛错时由调用方决定是否提示
 */
export async function copyPromptToClipboard(options: CopyPromptOptions): Promise<Prompt> {
  const { prompt, workspace, repository = fileRepository } = options;
  let target = prompt;
  if (!target.isContentLoaded) {
    if (!workspace) {
      throw new Error('当前未选择工作区，无法补全内容');
    }
    target = await PromptService.ensureContent(repository, workspace, prompt);
  }
  await navigator.clipboard.writeText(target.content);
  options.onCopied?.();
  if (workspace) {
    const updated = await PromptService.incrementCopyCount(repository, workspace, target);
    usePromptStore.getState().updatePrompt(updated);
    return updated;
  }
  return target;
}

export const PromptCard = memo(function PromptCard({
  prompt,
  onMenuOpenChange,
}: PromptCardProps) {
  const { locale, t } = useTranslation();
  const { setSelectedPrompt, openModal, selectedPromptIds, toggleSelectPrompt } = useUIStore();
  const { updatePrompt } = usePromptStore();
  const { workspace } = useFileStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMenuOpenRef = useRef(false);
  const isSelected = selectedPromptIds.includes(prompt.id);
  const isSelectionMode = selectedPromptIds.length > 0;

  const preview = prompt.preview;

  const createdDateTime = formatDateTime(getPromptCardDate(prompt));

  // 点击卡片打开详情
  const handleClick = () => {
    setSelectedPrompt(prompt.id);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await copyPromptToClipboard({
        prompt,
        workspace,
        onCopied: () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
      });
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

  const setMenuOpen = useCallback((isOpen: boolean) => {
    isMenuOpenRef.current = isOpen;
    setIsMenuOpen(isOpen);
    onMenuOpenChange?.(isOpen ? prompt.id : null);
  }, [onMenuOpenChange, prompt.id]);

  const handleMenuSelect = (e: React.MouseEvent) => {
    handleSelect(e);
    setMenuOpen(false);
  };

  const handleMenuTogglePin = async (e: React.MouseEvent) => {
    await handleTogglePin(e);
    setMenuOpen(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrompt(prompt.id);
    openModal('share');
    setMenuOpen(false);
  };

  // 打开菜单
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!isMenuOpen);
  };

  // 编辑
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrompt(prompt.id);
    openModal('edit');
    setMenuOpen(false);
  };

  // 删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrompt(prompt.id);
    openModal('delete');
    setMenuOpen(false);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, setMenuOpen]);

  useEffect(() => {
    return () => {
      if (isMenuOpenRef.current) {
        onMenuOpenChange?.(null);
      }
    };
  }, [onMenuOpenChange]);

  return (
    <div
      onClick={handleClick}
      className={`
        prompt-card bg-surface rounded-card p-4 border
        hover:border-border hover:shadow-card-hover
        cursor-pointer transition-all duration-200
        group
        ${isSelected ? 'border-accent shadow-card-hover' : 'border-transparent'}
        ${isMenuOpen ? 'relative z-30' : ''}
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
              aria-label={isSelected ? t.app.deselect : t.app.select}
              title={isSelected ? t.app.deselect : t.app.select}
            >
              <span className="material-symbols-outlined text-lg">
                {isSelected ? 'check_box' : 'check_box_outline_blank'}
              </span>
            </button>
          )}
          {prompt.pinned && (
            <IconButton
              icon="star"
              label={t.app.unfavorite}
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
              label={t.app.moreActions}
              onClick={handleMenuClick}
              size="sm"
              variant="ghost"
            />
            {/* 下拉菜单 */}
            {isMenuOpen && (
              <PromptCardActionsMenu
                isPinned={prompt.pinned}
                isSelected={isSelected}
                locale={locale}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSelect={handleMenuSelect}
                onShare={handleShare}
                onTogglePin={handleMenuTogglePin}
              />
            )}
          </div>
        </div>
      </div>

      {/* 预览文本 */}
      <p className="prompt-card-preview text-sm text-muted line-clamp-4 mb-3">
        {preview}
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
        <span>{createdDateTime}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`
            w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors
            ${copied ? 'text-accent bg-accent-soft' : 'text-muted hover:bg-surface-dim hover:text-fg'}
          `}
          aria-label={t.app.copyPromptContent}
          title={copied ? t.app.copied : t.app.copy}
        >
          <span className="material-symbols-outlined text-base">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
    </div>
  );
});

export interface PromptCardActionsMenuProps {
  isPinned: boolean;
  isSelected: boolean;
  locale: Locale;
  onDelete: (event: React.MouseEvent) => void;
  onEdit: (event: React.MouseEvent) => void;
  onSelect: (event: React.MouseEvent) => void;
  onShare: (event: React.MouseEvent) => void;
  onTogglePin: (event: React.MouseEvent) => void | Promise<void>;
}

export function PromptCardActionsMenu({
  isPinned,
  isSelected,
  locale,
  onDelete,
  onEdit,
  onSelect,
  onShare,
  onTogglePin,
}: PromptCardActionsMenuProps) {
  const t = messages[locale];

  return (
    <div className="absolute right-0 top-full z-40 mt-1 w-36 rounded-lg border border-border bg-surface py-1 shadow-card">
      <PromptMenuButton
        icon={isSelected ? 'check_box' : 'check_box_outline_blank'}
        label={isSelected ? t.app.deselect : t.app.select}
        onClick={onSelect}
      />
      <PromptMenuButton
        icon={isPinned ? 'star' : 'star_border'}
        label={isPinned ? t.app.unfavorite : t.app.favorite}
        onClick={onTogglePin}
      />
      <PromptMenuButton icon="ios_share" label={t.app.sharePrompt} onClick={onShare} />
      <PromptMenuButton icon="edit" label={t.app.edit} onClick={onEdit} />
      <PromptMenuButton
        icon="delete"
        label={t.app.delete}
        onClick={onDelete}
        className="text-red-600 hover:bg-red-50"
      />
    </div>
  );
}

interface PromptMenuButtonProps {
  icon: string;
  label: string;
  onClick: (event: React.MouseEvent) => void | Promise<void>;
  className?: string;
}

function PromptMenuButton({
  icon,
  label,
  onClick,
  className = 'text-fg hover:bg-surface-dim',
}: PromptMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${className}`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {label}
    </button>
  );
}

export function getPromptCardDate(prompt: Prompt): Date {
  return prompt.createdAt;
}

export { getPromptPreview };
