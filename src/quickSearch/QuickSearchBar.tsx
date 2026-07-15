/**
 * 快速搜索浮窗 UI（props 驱动的纯展示 + 键盘交互组件）。
 *
 * 受控组件，状态、IPC 与文案均由父层（QuickSearchApp → useQuickSearch）注入，
 * 便于在 jsdom 中独立测试渲染与键盘导航。
 *
 * 键位：↑↓ 选择，Enter 粘贴插入，Cmd/Ctrl+Enter 在主窗口打开详情，Esc 关闭。
 */
import { useEffect, useRef } from 'react';
import type { QuickSearchResultItem } from './quickSearchRpc';

interface QuickSearchBarProps {
  query: string;
  results: QuickSearchResultItem[];
  selectedIndex: number;
  isSearching: boolean;
  placeholder: string;
  noResultsText: string;
  resultsLabel: string;
  recentGroupLabel: string;
  searchGroupLabel: string;
  navigateLabel: string;
  pasteLabel: string;
  closeLabel: string;
  openDetailLabel: string;
  onQueryChange: (q: string) => void;
  onSelectIndex: (i: number) => void;
  onClose: () => void;
  onSubmit: (i: number) => void;
  onOpenDetail: (i: number) => void;
}

export function QuickSearchBar({
  query,
  results,
  selectedIndex,
  isSearching,
  placeholder,
  noResultsText,
  resultsLabel,
  recentGroupLabel,
  searchGroupLabel,
  navigateLabel,
  pasteLabel,
  closeLabel,
  openDetailLabel,
  onQueryChange,
  onSelectIndex,
  onClose,
  onSubmit,
  onOpenDetail,
}: QuickSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectIndex(Math.min(selectedIndex + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectIndex(Math.max(selectedIndex - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        onOpenDetail(selectedIndex);
      } else {
        onSubmit(selectedIndex);
      }
      return;
    }
  };

  const showNoResults = query.trim().length > 0 && results.length === 0 && !isSearching;
  const groupLabel = query.trim() ? searchGroupLabel : recentGroupLabel;

  return (
    <div className="h-screen w-screen flex flex-col bg-surface rounded-card shadow-card-hover overflow-hidden">
      <div className="flex items-center px-4 border-b border-border">
        <span
          data-tauri-drag-region=""
          className="w-10 self-stretch -ml-2 mr-1 flex shrink-0 cursor-move items-center justify-center"
        >
          <span className="material-symbols-outlined pointer-events-none text-lg text-muted">
            search
          </span>
        </span>
        <input
          id="quick-search-input"
          name="quick-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 py-4 text-sm text-fg placeholder:text-muted focus:outline-none bg-transparent"
        />
        {isSearching && <span className="text-xs text-muted">···</span>}
      </div>

      {showNoResults && (
        <div className="flex-1 px-4 py-6 text-center text-sm text-muted">{noResultsText}</div>
      )}

      {results.length > 0 && (
        <div
          role="listbox"
          aria-label={resultsLabel}
          className="flex-1 min-h-0 overflow-y-auto py-2"
        >
          <div className="px-4 py-1 text-xs font-semibold text-muted uppercase">
            {groupLabel}
          </div>
          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            const itemTone = isSelected
              ? 'bg-accent-soft text-accent'
              : 'hover:bg-surface-dim text-fg';
            const actionTone = isSelected
              ? 'text-accent opacity-100'
              : 'text-muted opacity-0 group-hover:opacity-100 focus:opacity-100';

            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => onSelectIndex(index)}
                className={`group w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${itemTone}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectIndex(index);
                    onSubmit(index);
                  }}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left"
                >
                  <span className="material-symbols-outlined text-xl shrink-0">
                    {item.pinned ? 'star' : 'description'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{item.title}</span>
                    {item.preview && (
                      <span className="block text-xs text-muted truncate">{item.preview}</span>
                    )}
                  </span>
                </button>
                {item.tags.length > 0 && (
                  <span className="text-xs text-muted shrink-0">#{item.tags[0]}</span>
                )}
                <button
                  type="button"
                  aria-label={openDetailLabel}
                  title={openDetailLabel}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectIndex(index);
                    onOpenDetail(index);
                  }}
                  className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-95 hover:bg-surface-dim hover:text-accent ${actionTone}`}
                >
                  <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted overflow-x-auto">
        <span className="flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">↑↓</kbd>
          {navigateLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">Enter</kbd>
          {pasteLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">⌘↵</kbd>
          {openDetailLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">Esc</kbd>
          {closeLabel}
        </span>
      </div>
    </div>
  );
}
