/**
 * 快速搜索浮窗 ↔ 主窗口的跨窗口 IPC 协议。
 *
 * 浮窗（quick-search webview）与主窗口（main webview）是隔离的 JS 上下文，
 * 通过 Tauri 全局事件通信。所有“请求-响应”型消息带 requestId，响应回带相同
 * requestId，浮窗只接受匹配当前请求的响应，避免乱序覆盖。
 */
import type { Prompt } from '@/types/prompt';

/** 事件名 */
export const QS_SEARCH = 'qs:search';
export const QS_SEARCH_RESULT = 'qs:search-result';
export const QS_GET_CONTENT = 'qs:get-content';
export const QS_CONTENT_RESULT = 'qs:content-result';
export const QS_OPEN_DETAIL = 'qs:open-detail';
export const QS_COPIED = 'qs:copied';

/** 浮窗展示用的精简结果（不含 content，避免跨窗口传输大字段） */
export interface QuickSearchResultItem {
  id: string;
  title: string;
  preview: string;
  tags: string[];
  pinned: boolean;
  copyCount: number;
}

export interface SearchRequestPayload {
  requestId: number;
  query: string;
}

export interface SearchResultPayload {
  requestId: number;
  results: QuickSearchResultItem[];
}

export interface GetContentRequestPayload {
  requestId: number;
  id: string;
}

export interface ContentResultPayload {
  requestId: number;
  id: string;
  content: string;
}

/** 把完整 Prompt 映射为浮窗精简结果（纯函数）。 */
export function toQuickSearchResultItem(prompt: Prompt): QuickSearchResultItem {
  return {
    id: prompt.id,
    title: prompt.title,
    preview: prompt.preview,
    tags: prompt.tags,
    pinned: prompt.pinned,
    copyCount: prompt.copyCount,
  };
}
