/**
 * 右键上下文菜单
 *
 * 通过 createPortal 渲染到 document.body，规避祖先元素 overflow:hidden / transform
 * 对定位的干扰（仿 ShareImageModal 的 portal 模式）。position:fixed 定位到点击坐标，
 * 靠近视口边缘时自动翻转方向避免溢出。
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  /** 唯一标识， onSelect 回调会带这个 key */
  key: string;
  label: string;
  icon?: string;
  /** 危险操作（删除等），渲染为红色 */
  danger?: boolean;
  disabled?: boolean;
  /** 是否在前面插入分隔线 */
  separatorBefore?: boolean;
}

export interface ContextMenuProps {
  open: boolean;
  /** 菜单左上角锚点（通常取 contextmenu 事件的 clientX/clientY） */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  onSelect: (key: string) => void;
}

const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 36;
const SEPARATOR_HEIGHT = 9;

function estimateMenuHeight(items: MenuItem[]): number {
  return items.reduce(
    (total, item) => total + (item.separatorBefore ? SEPARATOR_HEIGHT : 0) + MENU_ITEM_HEIGHT,
    0,
  );
}

export function ContextMenu({ open, x, y, items, onClose, onSelect }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: y, left: x });

  // 测量并计算最终位置（防止溢出视口）
  useLayoutEffect(() => {
    if (!open) return;
    const menuHeight = Math.max(estimateMenuHeight(items), MENU_ITEM_HEIGHT);
    const margin = 4;
    const maxLeft = Math.max(margin, window.innerWidth - MENU_WIDTH - margin);
    const maxTop = Math.max(margin, window.innerHeight - menuHeight - margin);
    setPosition({
      left: Math.min(Math.max(margin, x), maxLeft),
      top: Math.min(Math.max(margin, y), maxTop),
    });
  }, [open, x, y, items]);

  // 关闭逻辑：ESC、菜单外 mousedown、滚动、失焦
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleBlur = () => onClose();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('contextmenu', handlePointerDown, true);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('contextmenu', handlePointerDown, true);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', onClose);
    };
  }, [open, onClose]);

  if (!open || items.length === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
      className="z-[60] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-card-hover"
      onClick={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <div key={item.key}>
          {item.separatorBefore && <div className="my-1 h-px bg-border" />}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              onSelect(item.key);
            }}
            className={`flex w-full items-center gap-2 px-3 text-left text-sm transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
              item.danger ? 'text-red-600' : 'text-fg'
            }`}
            style={{ height: MENU_ITEM_HEIGHT }}
          >
            {item.icon && (
              <span className={`material-symbols-outlined text-[18px] ${item.danger ? 'text-red-600' : 'text-muted'}`}>
                {item.icon}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
