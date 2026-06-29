/**
 * 快速搜索浮窗根组件（运行在独立 webview 窗口 quick-search 中）。
 *
 * 组合 useQuickSearch（状态 + IPC）与 QuickSearchBar（展示 + 键盘交互）。
 * 文案通过 useTranslation 注入；浮窗与主窗口共享 localStorage，故 locale 一致。
 * 关闭（Esc / 失焦）调用 Rust 命令 hide_quick_search 隐藏自身。
 */
import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '@/i18n/useTranslation';
import { useQuickSearch } from './useQuickSearch';
import { QuickSearchBar } from './QuickSearchBar';

export function QuickSearchApp() {
  const { t } = useTranslation();
  const {
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    isSearching,
    pasteSelected,
    openDetailSelected,
  } = useQuickSearch();

  const handleClose = useCallback(() => {
    void invoke('hide_quick_search');
  }, []);

  return (
    <QuickSearchBar
      query={query}
      results={results}
      selectedIndex={selectedIndex}
      isSearching={isSearching}
      placeholder={t.settings.quickSearch.placeholder}
      noResultsText={t.settings.quickSearch.noResults}
      resultsLabel={t.settings.quickSearch.resultsLabel}
      onQueryChange={setQuery}
      onSelectIndex={setSelectedIndex}
      onClose={handleClose}
      onSubmit={pasteSelected}
      onOpenDetail={openDetailSelected}
    />
  );
}
