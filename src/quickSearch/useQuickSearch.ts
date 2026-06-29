/**
 * 快速搜索浮窗的状态 + IPC hook（运行在 quick-search 浮窗窗口内）。
 *
 * 职责：
 * - 输入 debounce → emit 搜索请求给主窗口 → 监听结果 → 维护键盘导航选中态
 * - 根据结果数量动态调整浮窗高度
 * - pasteSelected：取正文 → 调 Rust 粘贴编排 → 通知主窗口计数 → 隐藏浮窗
 * - openDetailSelected：通知主窗口打开详情 → 隐藏浮窗
 *
 * 搜索/取正文/打开详情的真实数据都由主窗口处理，浮窗零业务状态。
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import {
  QS_SEARCH,
  QS_SEARCH_RESULT,
  QS_GET_CONTENT,
  QS_CONTENT_RESULT,
  QS_OPEN_DETAIL,
  QS_COPIED,
  type QuickSearchResultItem,
  type SearchResultPayload,
  type ContentResultPayload,
} from './quickSearchRpc';

interface QuickSearchPasteOutcome {
  pasted: boolean;
}

const WINDOW_WIDTH = 640;
const INPUT_HEIGHT = 64;
const ITEM_HEIGHT = 64;
const MAX_VISIBLE_ITEMS = 8;
const SEARCH_DEBOUNCE_MS = 120;
const GET_CONTENT_TIMEOUT_MS = 5000;

export interface UseQuickSearch {
  query: string;
  setQuery: (q: string) => void;
  results: QuickSearchResultItem[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  isSearching: boolean;
  pasteSelected: (index?: number) => Promise<void>;
  openDetailSelected: (index?: number) => Promise<void>;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useQuickSearch(): UseQuickSearch {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<QuickSearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 监听主窗口返回的搜索结果（仅接受匹配当前 requestId 的响应）
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let un: UnlistenFn | null = null;
    void (async () => {
      un = await listen<SearchResultPayload>(QS_SEARCH_RESULT, (event) => {
        if (event.payload.requestId !== requestIdRef.current) return;
        setResults(event.payload.results);
        setSelectedIndex(0);
        setIsSearching(false);
      });
      if (disposed) un?.();
    })();
    return () => {
      disposed = true;
      un?.();
    };
  }, []);

  // 根据结果数量动态调整浮窗高度（Spotlight 风格）。
  // 注意：macOS 上 resizable:false 会阻止 setSize 生效，故浮窗 resizable 必须为 true。
  useEffect(() => {
    if (!isTauri()) return;
    const visible = Math.min(results.length, MAX_VISIBLE_ITEMS);
    const height =
      results.length === 0 ? INPUT_HEIGHT : INPUT_HEIGHT + visible * ITEM_HEIGHT + 8;
    getCurrentWindow()
      .setSize(new LogicalSize(WINDOW_WIDTH, height))
      .catch((error) => {
        console.warn('Failed to resize quick search window:', error);
      });
  }, [results.length]);

  // 失焦自动隐藏（点击浮窗外即关闭，Spotlight 行为）
  useEffect(() => {
    if (!isTauri()) return;
    const handleBlur = () => {
      void invoke('hide_quick_search');
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (!isTauri()) return;
    requestIdRef.current += 1;
    const id = requestIdRef.current;
    setIsSearching(true);
    void emit(QS_SEARCH, { requestId: id, query: q });
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      debounceRef.current = setTimeout(() => runSearch(q), SEARCH_DEBOUNCE_MS);
    },
    [runSearch]
  );

  // 向主窗口请求某条 prompt 的完整正文（粘贴前补全），一次性监听 + 超时兜底
  const getContent = useCallback(async (id: string): Promise<string> => {
    if (!isTauri()) return '';
    return new Promise<string>((resolve) => {
      let un: UnlistenFn | null = null;
      const timer = setTimeout(() => {
        un?.();
        resolve('');
      }, GET_CONTENT_TIMEOUT_MS);
      void (async () => {
        un = await listen<ContentResultPayload>(QS_CONTENT_RESULT, (event) => {
          clearTimeout(timer);
          un?.();
          resolve(event.payload.content);
        });
        await emit(QS_GET_CONTENT, { requestId: 0, id });
      })();
    });
  }, []);

  const pasteSelected = useCallback(async (index = selectedIndex) => {
    const selected = results[index];
    if (!selected) return;
    const content = await getContent(selected.id);
    if (!content) return;
    try {
      const outcome = await invoke<QuickSearchPasteOutcome>('quick_search_paste', { content });
      if (!outcome.pasted) {
        console.warn('Quick search result was copied, but auto paste did not run.');
      }
      await emit(QS_COPIED, selected.id);
    } catch (error) {
      console.warn('Failed to paste quick search result:', error);
    }
  }, [results, selectedIndex, getContent]);

  const openDetailSelected = useCallback(async (index = selectedIndex) => {
    const selected = results[index];
    if (!selected) return;
    await emit(QS_OPEN_DETAIL, selected.id);
    await invoke('hide_quick_search');
  }, [results, selectedIndex]);

  return {
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    isSearching,
    pasteSelected,
    openDetailSelected,
  };
}
