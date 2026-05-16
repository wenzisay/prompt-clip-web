/**
 * 右侧抽屉组件
 */

import { useEffect } from 'react';
import { Overlay } from './Overlay';
import { IconButton } from './IconButton';

export interface SideDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

export function SideDrawer({
  isOpen,
  title,
  onClose,
  children,
  headerActions,
  footer,
  closeOnOverlayClick = true,
}: SideDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <Overlay
        isOpen={isOpen}
        onClose={closeOnOverlayClick ? onClose : undefined}
        blur
      />

      <section
        className={`
          fixed top-0 right-0 h-full w-detail bg-surface border-l border-border
          shadow-card-hover transform transition-transform duration-200 ease-out
          z-40 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-modal="true"
        role="dialog"
      >
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border">
          <h2 className="font-semibold text-fg truncate flex-1">{title}</h2>
          <div className="flex items-center gap-1">
            {headerActions}
            <IconButton
              icon="close"
              label="关闭"
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-muted"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="h-14 shrink-0 flex items-center justify-end gap-2 px-4 border-t border-border">
            {footer}
          </div>
        )}
      </section>
    </>
  );
}
