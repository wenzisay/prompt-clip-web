/**
 * 测量容器宽度，按 `minmax(min(360px,100%),1fr)` 规则计算应渲染的列数。
 *
 * 在容器宽度变化时通过 ResizeObserver 实时更新。
 */

import { useEffect, useState } from 'react';

const MIN_CARD_WIDTH = 360;
const GRID_GAP = 16; // 与 Tailwind 的 gap-4 对应

export function useResponsiveColumnCount<T extends HTMLElement>(): {
  ref: (node: T | null) => void;
  columnCount: number;
} {
  const [columnCount, setColumnCount] = useState(1);
  const [node, setNode] = useState<T | null>(null);

  useEffect(() => {
    if (!node) return;
    const compute = (width: number) => {
      const perColumn = MIN_CARD_WIDTH + GRID_GAP;
      const next = Math.max(1, Math.floor((width + GRID_GAP) / perColumn));
      setColumnCount((current) => (current === next ? current : next));
    };
    compute(node.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        compute(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node]);

  return { ref: setNode, columnCount };
}
