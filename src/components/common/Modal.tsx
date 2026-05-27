/**
 * 模态框组件
 */

import { useEffect } from 'react';
import { DEFAULT_LOCALE, messages } from '@/i18n';
import { Overlay } from './Overlay';
import { IconButton } from './IconButton';

export interface ModalProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 内容区域自定义类名 */
  contentClassName?: string;
  /** 关闭按钮标签 */
  closeLabel?: string;
  /** 点击遮罩是否关闭 */
  closeOnOverlayClick?: boolean;
  /** 按 ESC 键是否关闭 */
  closeOnEscape?: boolean;
}

const maxWidthClasses: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  className = '',
  contentClassName = '',
  closeLabel = messages[DEFAULT_LOCALE].app.close,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  // ESC 键关闭
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // 滚动锁定
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <Overlay
        isOpen={isOpen}
        onClose={closeOnOverlayClick ? onClose : undefined}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
      >
        <div
          className={`
            w-full ${maxWidthClasses[maxWidth]} bg-surface rounded-card
            shadow-card-hover transform transition-all duration-200
            ${className}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              {title && (
                <h2 className="text-lg font-semibold text-fg">{title}</h2>
              )}
              {showCloseButton && (
                <IconButton
                  icon="close"
                  label={closeLabel}
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>
          )}

          {/* 内容 */}
          <div className={`px-6 py-4 ${contentClassName}`}>{children}</div>
        </div>
      </div>
    </>
  );
}
