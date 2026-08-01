/**
 * 顶部栏组件
 */

import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { IconButton } from '@/components/common';
import { useTranslation } from '@/i18n';
import { useEffect, useState } from 'react';

interface ShortcutKeyParts {
  modifier: string;
  key: string;
  shortcut: string;
}

export function getCommandPaletteShortcutKeyParts(platform: string): ShortcutKeyParts {
  const isMac = platform.toUpperCase().includes('MAC');
  const modifier = isMac ? '⌘' : 'Ctrl';

  return {
    modifier,
    key: 'K',
    shortcut: isMac ? 'Command K' : 'Ctrl K',
  };
}

export function TopBar() {
  const { t } = useTranslation();
  const { workspaceName } = useFileStore();
  const { openCommandPalette, openModal } = useUIStore();
  const { filter } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');
  const shortcutKeyParts = getCommandPaletteShortcutKeyParts(navigator.platform);

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
            {workspaceName || t.app.noWorkspace}
          </span>
        </div>

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
            placeholder={t.app.searchPlaceholder}
            className="h-full w-full rounded-xl bg-transparent pl-12 pr-12 text-sm text-fg outline-none placeholder:text-muted sm:pr-52"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="rounded-md p-1 transition-colors hover:bg-surface-high"
                aria-label={t.app.clearSearch}
              >
                <span className="material-symbols-outlined text-lg text-muted">
                  close
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label={t.app.quickSwitchAria(shortcutKeyParts.shortcut)}
              className="hidden rounded-lg border border-[rgba(113,119,134,0.12)] bg-surface-dim px-2 py-1 text-xs font-medium leading-none text-muted transition-colors hover:bg-surface-high hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:flex sm:items-center sm:gap-2"
            >
              <span>{t.app.quickSwitch}</span>
              <span className="flex items-center gap-1.5">
                <kbd className="min-w-6 rounded-md border border-[rgba(113,119,134,0.14)] bg-surface px-1.5 py-0.5 text-center font-mono text-[12px] font-medium leading-none">
                  {shortcutKeyParts.modifier}
                </kbd>
                <span aria-hidden="true" className="font-mono text-xs">
                  +
                </span>
                <kbd className="min-w-6 rounded-md border border-[rgba(113,119,134,0.14)] bg-surface px-1.5 py-0.5 text-center font-mono text-[12px] font-medium leading-none">
                  {shortcutKeyParts.key}
                </kbd>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <IconButton
          icon="download"
          label={t.app.exportPrompts}
          onClick={() => openModal('export')}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon="add"
          label={t.app.createPrompt}
          onClick={() => openModal('create')}
          variant="primary"
          size="sm"
        />
      </div>
    </header>
  );
}
