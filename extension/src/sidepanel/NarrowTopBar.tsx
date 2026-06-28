/**
 * 窄列顶栏
 *
 * 精简自仓库根 TopBar：菜单按钮（呼出导航抽屉）+ 全宽搜索框 + 快速切换（⌘K）+ 新建按钮。
 * 搜索防抖逻辑、快捷键显示复用 TopBar 的 getCommandPaletteShortcutKeyParts。
 */
import { useEffect, useState } from 'react';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { IconButton } from '@/components/common';
import { getCommandPaletteShortcutKeyParts } from '@/components/layout/TopBar';
import { useTranslation } from '@/i18n';

interface NarrowTopBarProps {
  onOpenNav: () => void;
}

export function NarrowTopBar({ onOpenNav }: NarrowTopBarProps) {
  const { t } = useTranslation();
  const { filter } = usePromptStore();
  const { openModal, openCommandPalette } = useUIStore();
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery || '');
  const shortcut = getCommandPaletteShortcutKeyParts(navigator.platform);

  useEffect(() => {
    setSearchQuery(filter.searchQuery || '');
  }, [filter.searchQuery]);

  useEffect(() => {
    if (searchQuery === (filter.searchQuery || '')) return;
    const timer = setTimeout(() => {
      usePromptStore.getState().setFilter({ searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [filter.searchQuery, searchQuery]);

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2">
      <button
        type="button"
        onClick={onOpenNav}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim hover:text-fg"
        aria-label={t.app.tags}
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div className="relative min-w-0 flex-1">
        <span
          className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[18px] leading-none">search</span>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.app.searchPlaceholder}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-11 pr-9 text-sm text-fg outline-none focus:border-accent"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-surface-high"
            aria-label={t.app.clearSearch}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>

      {/* 快速切换（命令面板）—— 同 web 端，平台相关快捷键 */}
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label={t.app.quickSwitchAria(shortcut.shortcut)}
        title={t.app.quickSwitch}
        className="flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface-dim px-1.5 text-muted transition-colors hover:bg-surface-high hover:text-fg"
      >
        <kbd className="font-mono text-[11px] font-medium leading-none">{shortcut.modifier}</kbd>
        <kbd className="font-mono text-[11px] font-medium leading-none">{shortcut.key}</kbd>
      </button>

      <IconButton
        icon="add"
        label={t.app.createPrompt}
        onClick={() => openModal('create')}
        variant="primary"
        size="sm"
      />
    </header>
  );
}
