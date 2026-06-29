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

  return (
    <div className="h-screen w-screen flex flex-col bg-surface rounded-xl shadow-card-hover overflow-hidden">
      <div className="flex items-center px-4 border-b border-border">
        <span className="material-symbols-outlined text-lg text-muted mr-3">search</span>
        <input
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
        <div className="px-4 py-6 text-center text-sm text-muted">{noResultsText}</div>
      )}

      {results.length > 0 && (
        <div
          role="listbox"
          aria-label={resultsLabel}
          className="flex-1 min-h-0 overflow-y-auto py-1"
        >
          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            const itemTone = isSelected
              ? 'bg-accent-soft text-accent'
              : 'hover:bg-surface-dim text-fg';
            const actionTone = isSelected
              ? 'text-accent hover:bg-accent-soft'
              : 'text-muted hover:bg-surface-dim hover:text-fg';

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
                  aria-label="在主应用中打开详情"
                  title="在主应用中打开详情"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectIndex(index);
                    onOpenDetail(index);
                  }}
                  className={`h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md transition-colors ${actionTone}`}
                >
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
