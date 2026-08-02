/**
 * 轻量 Tooltip 组件
 *
 * 用自定义浮层替代浏览器原生 `title`，使显示延迟可控（原生延迟由系统决定，通常较慢）。
 * 默认 300ms 后显示，鼠标移出立即取消计时。通过包裹子元素并在容器上监听 hover/focus 触发，
 * 因此不会干扰子元素自身的 ref 与事件。
 */

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  /** 提示内容（为空时不渲染浮层，便于按条件使用） */
  content: ReactNode;
  /** 被包裹的触发元素 */
  children: ReactNode;
  /** hover 后到显示的延迟（毫秒），默认 300 */
  delay?: number;
  /** 浮层相对触发元素的位置，默认 top */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const sideToTransform: Record<NonNullable<TooltipProps['side']>, string> = {
  top: '-translate-x-1/2 -translate-y-full',
  bottom: '-translate-x-1/2 translate-y-0',
  left: '-translate-x-full -translate-y-1/2',
  right: 'translate-x-0 -translate-y-1/2',
};

export function Tooltip({
  content,
  children,
  delay = 300,
  side = 'top',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null
  );
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const gap = 8;
    let left = rect.left + rect.width / 2;
    let top = rect.top - gap;
    if (side === 'bottom') top = rect.bottom + gap;
    if (side === 'left') {
      left = rect.left - gap;
      top = rect.top + rect.height / 2;
    }
    if (side === 'right') {
      left = rect.right + gap;
      top = rect.top + rect.height / 2;
    }
    setCoords({ left, top });
  }, [side]);

  const show = useCallback(() => {
    clearShowTimer();
    showTimer.current = setTimeout(() => {
      measure();
      setVisible(true);
    }, delay);
  }, [clearShowTimer, delay, measure]);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer]);

  return (
    <span
      ref={wrapperRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && coords
        ? createPortal(
            <div
              role="tooltip"
              style={{ left: coords.left, top: coords.top }}
              className={`pointer-events-none fixed z-50 max-w-xs whitespace-nowrap rounded-md
                bg-fg px-2 py-1 text-xs text-surface shadow-card ${sideToTransform[side]}`}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
