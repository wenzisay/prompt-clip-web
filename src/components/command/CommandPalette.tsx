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
  category?: 'action' | 'prompt';
}

export function CommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette, openModal } = useUIStore();
  const { prompts } = usePromptStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 基础命令
  const baseCommands: Command[] = [
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
        // 聚焦到搜索框
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
        // TODO: 实现导入功能
        console.log('导入功能待实现');
      },
      category: 'action',
    },
    {
      id: 'settings',
      label: '设置',
      icon: 'settings',
      action: () => {
        closeCommandPalette();
        // TODO: 实现设置功能
        console.log('设置功能待实现');
      },
      category: 'action',
    },
  ];

  // 最近使用的 Prompts（取前 5 个）
  const recentPrompts = useMemo(() => {
    return prompts
      .filter((p) => p.copyCount > 0 || p.pinned)
      .slice(0, 5)
      .map((prompt) => ({
        id: prompt.id,
        label: prompt.title,
        icon: 'description',
        action: () => {
          closeCommandPalette();
          useUIStore.getState().setSelectedPrompt(prompt.id);
        },
        category: 'prompt' as const,
      }));
  }, [prompts]);

  // 所有命令
  const allCommands = useMemo(() => {
    return [...baseCommands, ...recentPrompts] as Command[];
  }, [baseCommands, recentPrompts]);

  // 过滤命令
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery)
    );
  }, [allCommands, query]);

  // 分组显示
  const actionCommands = filteredCommands.filter((c) => c.category === 'action');
  const promptCommands = filteredCommands.filter((c) => c.category === 'prompt');

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

  // 键盘导航
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) =>
            Math.min(i + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          filteredCommands[selectedIndex]?.action();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, filteredCommands]);

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
            {filteredCommands.length === 0 ? (
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
                {promptCommands.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-muted uppercase">
                      最近使用
                    </div>
                    {promptCommands.map((cmd, index) => (
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
