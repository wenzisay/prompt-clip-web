/**
 * 主窗口侧的快速搜索桥。
 *
 * 监听浮窗（quick-search webview）发来的请求，复用主窗口已有的
 * SearchService / PromptService / store 处理后回传结果：
 * - qs:search       → SearchService.search → 回传精简结果
 * - qs:get-content  → PromptService.ensureContent → 回传正文（粘贴前补全）
 * - qs:open-detail  → setSelectedPrompt + 显示并聚焦主窗口
 * - qs:copied       → incrementCopyCount + updatePrompt
 *
 * 仅在主窗口（main webview）挂载；浮窗不调用此 hook。
 */
import { useEffect } from 'react';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SearchService } from '@/services/searchService';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import {
  QS_SEARCH,
  QS_SEARCH_RESULT,
  QS_GET_CONTENT,
  QS_CONTENT_RESULT,
  QS_OPEN_DETAIL,
  QS_COPIED,
  toQuickSearchResultItem,
  type SearchRequestPayload,
  type SearchResultPayload,
  type GetContentRequestPayload,
  type ContentResultPayload,
} from '@/quickSearch/quickSearchRpc';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function useQuickSearchBridge(): void {
  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    const unlistens: UnlistenFn[] = [];

    void (async () => {
      const unSearch = await listen<SearchRequestPayload>(QS_SEARCH, async (event) => {
        const { requestId, query } = event.payload;
        const prompts = await SearchService.search(query);
        const payload: SearchResultPayload = {
          requestId,
          results: prompts.map(toQuickSearchResultItem),
        };
        await emit(QS_SEARCH_RESULT, payload);
      });

      const unGetContent = await listen<GetContentRequestPayload>(
        QS_GET_CONTENT,
        async (event) => {
          const { requestId, id } = event.payload;
          const workspace = useFileStore.getState().workspace;
          const prompt = usePromptStore.getState().prompts.find((p) => p.id === id);
          let content = '';
          if (workspace && prompt) {
            const full = await PromptService.ensureContent(fileRepository, workspace, prompt);
            content = full.content;
          }
          const payload: ContentResultPayload = { requestId, id, content };
          await emit(QS_CONTENT_RESULT, payload);
        }
      );

      const unOpenDetail = await listen<string>(QS_OPEN_DETAIL, async (event) => {
        useUIStore.getState().setSelectedPrompt(event.payload);
        await getCurrentWindow().show();
        await getCurrentWindow().setFocus();
      });

      const unCopied = await listen<string>(QS_COPIED, async (event) => {
        const workspace = useFileStore.getState().workspace;
        const prompt = usePromptStore.getState().prompts.find((p) => p.id === event.payload);
        if (!workspace || !prompt) return;
        const updated = await PromptService.incrementCopyCount(fileRepository, workspace, prompt);
        usePromptStore.getState().updatePrompt(updated);
      });

      if (disposed) {
        [unSearch, unGetContent, unOpenDetail, unCopied].forEach((fn) => fn());
        return;
      }
      unlistens.push(unSearch, unGetContent, unOpenDetail, unCopied);
    })();

    return () => {
      disposed = true;
      unlistens.forEach((fn) => fn());
    };
  }, []);
}
