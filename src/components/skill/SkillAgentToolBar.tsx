import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AgentTool } from '@/types/skill';

const TOOL_ITEM_WIDTH = 40;
const TOOL_GAP = 8;
// The "more" trigger is now a 40×40 tile that visually matches the tool icon tiles.
const MORE_BUTTON_WIDTH = 40;
const DEFAULT_TOOLBAR_WIDTH = 360;
const MENU_WIDTH = 224; // w-56
const MENU_ITEM_HEIGHT = 40;
const MENU_PADDING_Y = 8; // py-1 (top + bottom)
const POSITION_GAP = 8;
const VIEWPORT_MARGIN = 8;

function estimateMenuHeight(itemCount: number): number {
  return Math.max(itemCount, 1) * MENU_ITEM_HEIGHT + MENU_PADDING_Y;
}

export interface SkillAgentToolBarProps {
  tools: AgentTool[];
  moreLabel: string;
  renderTool: (tool: AgentTool, mode: 'icon' | 'menu') => ReactNode;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Calculates how many fixed-size tool buttons can remain visible in one row.
 *
 * The more button is reserved only when the complete tool list does not fit,
 * so the last visible icon is never partially clipped by the overflow edge.
 */
export function getVisibleToolCount(containerWidth: number, toolCount: number): number {
  if (toolCount <= 0) return 0;

  const allToolsWidth = toolCount * TOOL_ITEM_WIDTH + (toolCount - 1) * TOOL_GAP;
  if (allToolsWidth <= containerWidth) return toolCount;

  const availableWidth = containerWidth - MORE_BUTTON_WIDTH - TOOL_GAP;
  if (availableWidth < TOOL_ITEM_WIDTH) return 0;

  return Math.min(
    toolCount - 1,
    Math.floor((availableWidth + TOOL_GAP) / (TOOL_ITEM_WIDTH + TOOL_GAP))
  );
}

export function SkillAgentToolBar({
  tools,
  moreLabel,
  renderTool,
  onOpenChange,
}: SkillAgentToolBarProps) {
  const [toolbarNode, setToolbarNode] = useState<HTMLDivElement | null>(null);
  const [toolbarWidth, setToolbarWidth] = useState(DEFAULT_TOOLBAR_WIDTH);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleCount = getVisibleToolCount(toolbarWidth, tools.length);
  const visibleTools = tools.slice(0, visibleCount);
  const hiddenTools = tools.slice(visibleCount);

  const updateMenuState = useCallback(
    (open: boolean) => {
      setMenuOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange]
  );

  useLayoutEffect(() => {
    if (!toolbarNode) return;

    const updateWidth = (width = toolbarNode.clientWidth) => {
      // A zero width only occurs before a detached test node or a hidden view
      // has been laid out. Keep a conservative one-row fallback until the
      // observer reports the real width.
      const nextWidth = width > 0 ? width : DEFAULT_TOOLBAR_WIDTH;
      setToolbarWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => updateWidth();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      updateWidth(width);
    });
    observer.observe(toolbarNode);
    return () => observer.disconnect();
  }, [toolbarNode]);

  // Auto-close when the row grows wide enough to show every tool.
  useEffect(() => {
    if (hiddenTools.length === 0 && isMenuOpen) {
      updateMenuState(false);
    }
  }, [hiddenTools.length, isMenuOpen, updateMenuState]);

  // Measure the trigger and place the floating menu, flipping upward when the
  // card sits in the lower half of the viewport so the menu never overflows.
  useLayoutEffect(() => {
    if (!isMenuOpen) {
      setCoords(null);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = estimateMenuHeight(hiddenTools.length);
    const gap = POSITION_GAP;
    const margin = VIEWPORT_MARGIN;

    let left = rect.right - MENU_WIDTH;
    left = Math.max(margin, Math.min(left, window.innerWidth - MENU_WIDTH - margin));

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top: number;
    if (spaceBelow >= menuHeight + gap) {
      top = rect.bottom + gap;
    } else if (spaceAbove >= menuHeight + gap) {
      top = rect.top - gap - menuHeight;
    } else if (spaceBelow >= spaceAbove) {
      top = rect.bottom + gap;
    } else {
      top = rect.top - gap - menuHeight;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin));

    setCoords({ left, top });
  }, [isMenuOpen, hiddenTools.length]);

  // Close on outside click, Escape, and viewport resize.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      updateMenuState(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        updateMenuState(false);
      }
    };
    const handleResize = () => updateMenuState(false);

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen, updateMenuState]);

  if (tools.length === 0) return null;

  return (
    <div
      ref={setToolbarNode}
      data-testid="skill-agent-tools"
      className="mt-auto flex min-w-0 flex-nowrap items-center gap-2 border-t border-border pt-3"
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden">
        {visibleTools.map((tool) => (
          <Fragment key={tool.id}>{renderTool(tool, 'icon')}</Fragment>
        ))}
      </div>

      {hiddenTools.length > 0 && (
        <button
          type="button"
          ref={triggerRef}
          aria-label={moreLabel}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
            bg-accent-soft text-sm font-semibold text-accent transition-colors hover:bg-surface-dim"
          onClick={(event) => {
            event.stopPropagation();
            updateMenuState(!isMenuOpen);
          }}
        >
          +{hiddenTools.length}
        </button>
      )}

      {isMenuOpen && coords && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: 'fixed', left: coords.left, top: coords.top, width: MENU_WIDTH }}
              className="z-[60] max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-card-hover"
            >
              {hiddenTools.map((tool) => (
                <Fragment key={tool.id}>{renderTool(tool, 'menu')}</Fragment>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
