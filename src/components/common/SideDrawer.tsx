/**
 * 右侧抽屉组件
 */

import { useEffect, useState } from 'react';
import { DEFAULT_LOCALE, messages } from '@/i18n';
import { Overlay } from './Overlay';
import { IconButton } from './IconButton';

const DRAWER_WIDTH_STORAGE_KEY = 'promptclip:drawer-width';
const LEGACY_DEFAULT_DRAWER_WIDTH = 480;
const DEFAULT_DRAWER_WIDTH = 560;
const MIN_DRAWER_WIDTH = 360;
const VIEWPORT_MARGIN = 64;

function getMaxDrawerWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_DRAWER_WIDTH;
  const minWidth = Math.min(MIN_DRAWER_WIDTH, window.innerWidth);
  return Math.max(minWidth, window.innerWidth - VIEWPORT_MARGIN);
}

function clampDrawerWidth(width: number): number {
  if (typeof window === 'undefined') return width;

  const minWidth = Math.min(MIN_DRAWER_WIDTH, window.innerWidth);
  const maxWidth = Math.max(minWidth, getMaxDrawerWidth());
  return Math.min(Math.max(width, minWidth), maxWidth);
}

function getInitialDrawerWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_DRAWER_WIDTH;

  const storedWidth = window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
  const parsedStoredWidth = storedWidth ? Number(storedWidth) : null;
  const parsedWidth =
    parsedStoredWidth === LEGACY_DEFAULT_DRAWER_WIDTH
      ? DEFAULT_DRAWER_WIDTH
      : parsedStoredWidth ?? DEFAULT_DRAWER_WIDTH;
  return clampDrawerWidth(Number.isFinite(parsedWidth) ? parsedWidth : DEFAULT_DRAWER_WIDTH);
}

export interface SideDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeLabel?: string;
  resizeLabel?: string;
  resizeTitle?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export function SideDrawer({
  isOpen,
  title,
  onClose,
  children,
  header,
  headerActions,
  footer,
  closeOnOverlayClick = true,
  closeLabel = messages[DEFAULT_LOCALE].app.close,
  resizeLabel = messages[DEFAULT_LOCALE].app.resizeDrawer,
  resizeTitle = messages[DEFAULT_LOCALE].app.dragResize,
  panelClassName = '',
  bodyClassName = '',
}: SideDrawerProps) {
  const [drawerWidth, setDrawerWidth] = useState(getInitialDrawerWidth);
  const [isResizing, setIsResizing] = useState(false);

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

  useEffect(() => {
    const handleResize = () => {
      setDrawerWidth((width) => clampDrawerWidth(width));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);
    let nextStoredWidth = drawerWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampDrawerWidth(window.innerWidth - moveEvent.clientX);
      nextStoredWidth = nextWidth;
      setDrawerWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(nextStoredWidth));
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  return (
    <>
      <Overlay
        isOpen={isOpen}
        onClose={closeOnOverlayClick ? onClose : undefined}
        blur
      />

      <section
        className={`
          fixed top-0 right-0 h-full bg-surface border-l border-border
          shadow-card-hover transform transition-transform duration-200 ease-out
          z-40 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          ${panelClassName}
        `}
        style={{ width: drawerWidth }}
        aria-modal="true"
        role="dialog"
      >
        <div
          className={`
            absolute left-0 top-0 z-10 h-full w-2 -translate-x-1/2 cursor-ew-resize
            transition-colors hover:bg-accent-soft
            ${isResizing ? 'bg-accent-soft' : ''}
          `}
          onPointerDown={handleResizeStart}
          onDoubleClick={() => {
            const nextWidth = clampDrawerWidth(DEFAULT_DRAWER_WIDTH);
            setDrawerWidth(nextWidth);
            window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(nextWidth));
          }}
          aria-label={resizeLabel}
          role="separator"
          title={resizeTitle}
        />

        {header ?? (
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border">
            <h2 className="font-semibold text-fg truncate flex-1">{title}</h2>
            <div className="flex items-center gap-1">
              {headerActions}
              <IconButton
                icon="close"
                label={closeLabel}
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="text-muted"
              />
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto p-6 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="h-14 shrink-0 flex items-center justify-end gap-2 px-4 border-t border-border">
            {footer}
          </div>
        )}
      </section>
    </>
  );
}
