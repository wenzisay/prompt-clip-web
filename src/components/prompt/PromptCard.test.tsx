import { describe, expect, it } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { getPromptCardDate, getPromptPreview } from './PromptCard';

const prompt: Prompt = {
  id: 'date-card',
  title: 'Date Card',
  content: 'Content',
  tags: [],
  createdAt: new Date('2026-05-17T00:00:00.000Z'),
  updatedAt: new Date('2026-05-16T00:00:00.000Z'),
  copyCount: 0,
  pinned: true,
  pinnedAt: new Date('2026-05-15T00:00:00.000Z'),
  filePath: 'date-card.md',
};

describe('PromptCard date display', () => {
  it('shows created time in all view', () => {
    const date = getPromptCardDate(prompt, {
      favoritesOnly: false,
      recentOnly: false,
    });

    expect(date).toBe(prompt.createdAt);
  });

  it('shows updated time in recently modified view', () => {
    const date = getPromptCardDate(prompt, {
      favoritesOnly: false,
      recentOnly: true,
    });

    expect(date).toBe(prompt.updatedAt);
  });

  it('shows pinned time in favorites view', () => {
    const date = getPromptCardDate(prompt, {
      favoritesOnly: true,
      recentOnly: false,
    });

    expect(date).toBe(prompt.pinnedAt);
  });

  it('falls back to updated time when favorite has no pinned time', () => {
    const date = getPromptCardDate({ ...prompt, pinnedAt: undefined }, {
      favoritesOnly: true,
      recentOnly: false,
    });

    expect(date).toBe(prompt.updatedAt);
  });
});

describe('PromptCard preview text', () => {
  it('uses the first four lines joined by a space', () => {
    const preview = getPromptPreview('第一行\n第二行\n第三行\n第四行\n第五行不应该进入预览');

    expect(preview).toEqual({
      text: '第一行 第二行 第三行 第四行',
      isTruncated: true,
    });
  });

  it('limits preview text to 120 characters', () => {
    const preview = getPromptPreview(`${'a'.repeat(130)}\n第二行`);

    expect(preview.text).toHaveLength(120);
    expect(preview.isTruncated).toBe(true);
  });
});
