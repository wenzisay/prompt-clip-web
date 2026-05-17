/**
 * 命令面板组件
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { Overlay } from '@/components/common';

interface Command {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  shortcut?: string;
  category?: 'action' | 'prompt' | 'search';
}

export function CommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette, openModal } = useUIStore();
  const { prompts } = usePromptStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 基础命令
  const baseCommands: Command[] = useMemo(
    () => [
      {
        id: 'new-prompt',
        label: '新建 Prompt',
        icon: 'add',
        action: () => {
          closeCommandPalette();
          openModal('create');
        },
        shortcut: 'Cmd+N',
        category: 'action',
      },
      {
        id: 'search',
        label: '搜索 Prompts',
        icon: 'search',
        action: () => {
          closeCommandPalette();
        },
        shortcut: 'Cmd+K',
        category: 'action',
      },
      {
        id: 'export',
        label: '导出 Prompts',
        icon: 'download',
        action: () => {
          closeCommandPalette();
          openModal('export');
        },
        category: 'action',
      },
      {
        id: 'import',
        label: '导入 Prompts',
        icon: 'upload',
        action: () => {
          closeCommandPalette();
          window.alert('导入功能将在后续版本提供');
        },
        category: 'action',
      },
      {
        id: 'settings',
        label: '设置',
        icon: 'settings',
        action: () => {
          closeCommandPalette();
          window.alert('设置功能将在后续版本提供');
        },
        category: 'action',
      },
    ],
    [closeCommandPalette, openModal]
  );

  const promptCommands = useMemo(() => {
    const source = query.trim()
      ? prompts
      : prompts.filter((p) => p.copyCount > 0 || p.pinned).slice(0, 5);

    return source.map((prompt) => ({
      id: prompt.id,
      label: prompt.title,
      icon: 'description',
      action: () => {
        closeCommandPalette();
        useUIStore.getState().setSelectedPrompt(prompt.id);
      },
      category: 'prompt' as const,
    }));
  }, [closeCommandPalette, prompts, query]);

  // 所有命令
  const allCommands = useMemo(() => {
    return [...baseCommands, ...promptCommands] as Command[];
  }, [baseCommands, promptCommands]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery)
    );
  }, [allCommands, query]);

  const trimmedQuery = query.trim();
  const fullTextSearchCommand = useMemo<Command | null>(() => {
    if (!trimmedQuery || filteredCommands.length > 0) return null;

    return {
      id: 'full-text-search',
      label: `全文搜索「${trimmedQuery}」`,
      icon: 'manage_search',
      action: () => {
        closeCommandPalette();
        usePromptStore.getState().setFilter({ searchQuery: trimmedQuery });
      },
      category: 'search',
    };
  }, [closeCommandPalette, filteredCommands.length, trimmedQuery]);

  const visibleCommands = useMemo(
    () => (fullTextSearchCommand ? [fullTextSearchCommand] : filteredCommands),
    [filteredCommands, fullTextSearchCommand]
  );

  // 分组显示
  const actionCommands = visibleCommands.filter((c) => c.category === 'action');
  const titleCommands = visibleCommands.filter((c) => c.category === 'prompt');
  const searchCommands = visibleCommands.filter((c) => c.category === 'search');

  // ESC 键关闭
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isCommandPaletteOpen, closeCommandPalette]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isCommandPaletteOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex((index) =>
      Math.min(index, Math.max(visibleCommands.length - 1, 0))
    );
  }, [visibleCommands.length]);

  // 键盘导航
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) =>
            Math.min(i + 1, visibleCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          visibleCommands[selectedIndex]?.action();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, visibleCommands]);

  if (!isCommandPaletteOpen) return null;

  return (
    <>
      <Overlay isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} blur />

      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
        onClick={closeCommandPalette}
      >
        <div
          className="w-full max-w-xl bg-surface rounded-card shadow-card-hover overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 搜索输入 */}
          <div className="flex items-center px-4 border-b border-border">
            <span className="material-symbols-outlined text-lg text-muted mr-3">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入命令或搜索..."
              className="flex-1 py-4 text-sm text-fg placeholder:text-muted focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded hover:bg-surface-dim"
              >
                <span className="material-symbols-outlined text-lg text-muted">
                  close
                </span>
              </button>
            )}
          </div>

          {/* 命令列表 */}
          <div className="max-h-80 overflow-y-auto py-2">
            {visibleCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted">
                未找到匹配的命令
              </div>
            ) : (
              <>
                {/* 操作命令 */}
                {actionCommands.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1 text-xs font-semibold text-muted uppercase">
                      操作
                    </div>
                    {actionCommands.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors
                          ${
                            index === selectedIndex
                              ? 'bg-accent-soft text-accent'
                              : 'hover:bg-surface-dim text-fg'
                          }
                        `}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {cmd.icon}
                        </span>
                        <span className="flex-1">{cmd.label}</span>
                        {cmd.shortcut && (
                          <span className="text-xs text-muted">
                            {cmd.shortcut}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Prompt 命令 */}
                {titleCommands.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-muted uppercase">
                      {query.trim() ? '标题' : '最近使用'}
                    </div>
                    {titleCommands.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() =>
                          setSelectedIndex(actionCommands.length + index)
                        }
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors
                          ${
                            actionCommands.length + index === selectedIndex
                              ? 'bg-accent-soft text-accent'
                              : 'hover:bg-surface-dim text-fg'
                          }
                        `}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {cmd.icon}
                        </span>
                        <span className="flex-1 truncate">{cmd.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 全文搜索 */}
                {searchCommands.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-muted uppercase">
                      搜索
                    </div>
                    {searchCommands.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors
                          ${
                            index === selectedIndex
                              ? 'bg-accent-soft text-accent'
                              : 'hover:bg-surface-dim text-fg'
                          }
                        `}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {cmd.icon}
                        </span>
                        <span className="flex-1 truncate">{cmd.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部提示 */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">Enter</kbd>
              选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-dim rounded">Esc</kbd>
              关闭
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
