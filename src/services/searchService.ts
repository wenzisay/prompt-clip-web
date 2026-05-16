/**
 * 搜索服务
 *
 * 使用 FlexSearch 实现高性能全文搜索
 */

import FlexSearch from 'flexsearch';
import type { Prompt } from '@/types/prompt';

interface SearchIndex {
  addAsync(id: string, content: string): Promise<unknown>;
  searchAsync(query: string, options: { limit: number }): Promise<Array<string | number>>;
  remove(id: string): void;
}

/**
 * FlexSearch 索引实例
 */
let titleIndex: SearchIndex | null = null;
let contentIndex: SearchIndex | null = null;
let tagsIndex: SearchIndex | null = null;
let indexedPrompts: Map<string, Prompt> = new Map();

/**
 * 初始化搜索索引
 */
export function initSearchIndex(): void {
  const indexOptions = {
    tokenize: 'full' as const,
    resolution: 9 as const,
    optimize: true,
    cache: true,
  };

  titleIndex = new FlexSearch.Index(indexOptions) as SearchIndex;
  contentIndex = new FlexSearch.Index(indexOptions) as SearchIndex;
  tagsIndex = new FlexSearch.Index(indexOptions) as SearchIndex;
  indexedPrompts = new Map();
}

/**
 * 构建搜索索引
 */
export async function buildSearchIndex(prompts: Prompt[]): Promise<void> {
  if (!titleIndex) {
    initSearchIndex();
  }

  indexedPrompts.clear();

  for (const prompt of prompts) {
    await addToIndex(prompt);
  }
}

/**
 * 添加单个 Prompt 到索引
 */
export async function addToIndex(prompt: Prompt): Promise<void> {
  if (!titleIndex) {
    initSearchIndex();
  }
  if (!titleIndex || !contentIndex || !tagsIndex) return;

  indexedPrompts.set(prompt.id, prompt);

  await titleIndex.addAsync(prompt.id, prompt.title);
  await contentIndex.addAsync(prompt.id, prompt.content);
  await tagsIndex.addAsync(prompt.id, prompt.tags.join(' '));
}

/**
 * 从索引中移除 Prompt
 */
export function removeFromIndex(promptId: string): void {
  if (!titleIndex || !contentIndex || !tagsIndex) return;

  indexedPrompts.delete(promptId);
  try {
    titleIndex.remove(promptId);
    contentIndex.remove(promptId);
    tagsIndex.remove(promptId);
  } catch {
    // 忽略删除错误
  }
}

/**
 * 更新索引中的 Prompt
 */
export async function updateIndex(prompt: Prompt): Promise<void> {
  removeFromIndex(prompt.id);
  await addToIndex(prompt);
}

/**
 * 执行搜索
 */
export async function search(
  query: string,
  limit = 50
): Promise<Prompt[]> {
  if (!titleIndex || !query.trim()) {
    return [];
  }
  if (!contentIndex || !tagsIndex) return [];

  // 从所有索引中搜索并合并结果
  const titleResults = await titleIndex.searchAsync(query, { limit });
  const contentResults = await contentIndex.searchAsync(query, { limit });
  const tagsResults = await tagsIndex.searchAsync(query, { limit });

  // 合并结果并去重
  const resultMap = new Map<string, number>();

  for (const id of titleResults) {
    resultMap.set(id as string, (resultMap.get(id as string) || 0) + 10); // 标题权重最高
  }
  for (const id of contentResults) {
    resultMap.set(id as string, (resultMap.get(id as string) || 0) + 5); // 内容权重中等
  }
  for (const id of tagsResults) {
    resultMap.set(id as string, (resultMap.get(id as string) || 0) + 3); // 标签权重较低
  }

  // 按权重排序并转换为 Prompt 对象
  return Array.from(resultMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => indexedPrompts.get(id))
    .filter((p): p is Prompt => p !== undefined);
}

/**
 * 搜索并高亮匹配内容
 */
export async function searchWithHighlight(
  query: string,
  limit = 50
): Promise<Array<{ prompt: Prompt; highlights: string[] }>> {
  const prompts = await search(query, limit);
  const queryLower = query.toLowerCase();

  return prompts.map(prompt => {
    const highlights: string[] = [];

    if (prompt.title.toLowerCase().includes(queryLower)) {
      highlights.push('title');
    }
    if (prompt.content.toLowerCase().includes(queryLower)) {
      highlights.push('content');
    }
    if (prompt.tags.some(t => t.toLowerCase().includes(queryLower))) {
      highlights.push('tags');
    }

    return { prompt, highlights };
  });
}

/**
 * 清空搜索索引
 */
export function clearSearchIndex(): void {
  titleIndex = null;
  contentIndex = null;
  tagsIndex = null;
  indexedPrompts = new Map();
}

/**
 * 获取索引中的 Prompt 数量
 */
export function getIndexedCount(): number {
  return indexedPrompts.size;
}

/**
 * 导出 SearchService
 */
export const SearchService = {
  initSearchIndex,
  buildSearchIndex,
  addToIndex,
  removeFromIndex,
  updateIndex,
  search,
  searchWithHighlight,
  clearSearchIndex,
  getIndexedCount,
} as const;
