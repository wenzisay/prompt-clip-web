/**
 * 顶部栏组件
 */

import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { IconButton } from '@/components/common';
import { useEffect, useState } from 'react';

export function getCommandPaletteShortcutLabel(platform: string) {
  const isMac = platform.toUpperCase().includes('MAC');

  return isMac ? '快速切换 Command K' : '快速切换 Ctrl K';
}

export function TopBar() {
  const { workspaceName } = useFileStore();
  const { openCommandPalette, openModal } = useUIStore();
  const { filteredPrompts, filter } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');
  const shortcutLabel = getCommandPaletteShortcutLabel(navigator.platform);

  useEffect(() => {
    setSearchQuery(filter.searchQuery || '');
  }, [filter.searchQuery]);

  // 防抖搜索
  useEffect(() => {
    if (searchQuery === (filter.searchQuery || '')) return;

    const timer = setTimeout(() => {
      usePromptStore.getState().setFilter({ searchQuery });
    }, 300);

    return () => clearTimeout(timer);
  }, [filter.searchQuery, searchQuery]);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center gap-4 px-4">
      {/* 左侧：目录信息 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-muted">
          <span className="material-symbols-outlined text-lg">folder</span>
          <span className="text-sm truncate max-w-[200px]">
            {workspaceName || '未选择目录'}
          </span>
        </div>

        {/* 结果计数 */}
        {filter.searchQuery && (
          <span className="text-sm text-muted">
            找到 {filteredPrompts.length} 个结果
          </span>
        )}
      </div>

      {/* 搜索框 */}
      <div className="w-[min(560px,42vw)] max-w-[560px]">
        <div className="relative flex h-10 items-center rounded-xl border border-[rgba(113,119,134,0.14)] bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-colors focus-within:border-[rgba(113,119,134,0.24)] focus-within:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_0_0_4px_rgba(0,88,188,0.05)]">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-muted">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="快速搜索"
            className="h-full w-full rounded-xl bg-transparent pl-12 pr-12 text-sm text-fg outline-none placeholder:text-muted sm:pr-36"
          />
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="快速切换"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-[rgba(113,119,134,0.12)] bg-surface-dim px-2 py-1 text-xs font-medium leading-none text-muted transition-colors hover:bg-surface-high hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:flex sm:items-center sm:gap-1.5"
          >
            <span>快速切换</span>
            <kbd className="rounded-md border border-[rgba(113,119,134,0.14)] bg-surface px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none">
              {shortcutLabel.replace('快速切换 ', '')}
            </kbd>
          </button>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors hover:bg-surface-high sm:right-36"
              aria-label="清空搜索"
            >
              <span className="material-symbols-outlined text-lg text-muted">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <IconButton
          icon="download"
          label="导出 Prompts"
          onClick={() => openModal('export')}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon="add"
          label="新建 Prompt (Cmd+N)"
          onClick={() => openModal('create')}
          variant="primary"
          size="sm"
        />
      </div>
    </header>
  );
}
