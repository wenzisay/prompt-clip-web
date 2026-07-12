import { describe, it, expect } from 'vitest';
import { toQuickSearchResultItem } from './quickSearchRpc';
import type { Prompt } from '@/types/prompt';

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: '12345678901234567',
    title: '标题',
    content: '正文',
    preview: '预览',
    isContentLoaded: true,
    tags: ['计算机', 'Linux'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    copyCount: 3,
    pinned: true,
    filePath: 'foo.md',
    ...overrides,
  };
}

describe('toQuickSearchResultItem', () => {
  it('should map prompt display fields to result item', () => {
    const item = toQuickSearchResultItem(makePrompt());
    expect(item).toEqual({
      id: '12345678901234567',
      title: '标题',
      preview: '预览',
      tags: ['计算机', 'Linux'],
      pinned: true,
      copyCount: 3,
    });
  });

  it('should not carry the content field across to the result item', () => {
    const item = toQuickSearchResultItem(makePrompt({ content: 'secret-body' }));
    expect((item as unknown as Record<string, unknown>).content).toBeUndefined();
  });
});
