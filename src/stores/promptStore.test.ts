import { beforeEach, describe, expect, it } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { usePromptStore } from './promptStore';

function createPrompt(
  id: string,
  overrides: Partial<Prompt> = {}
): Prompt {
  return {
    id,
    title: id,
    content: '',
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: `${id}.md`,
    ...overrides,
  };
}

describe('usePromptStore filtering order', () => {
  beforeEach(() => {
    usePromptStore.getState().clearPrompts();
  });

  it('sorts all prompts by created time from newest to oldest', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('oldest', { createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      createPrompt('newest', { createdAt: new Date('2026-03-01T00:00:00.000Z') }),
      createPrompt('middle', { createdAt: new Date('2026-02-01T00:00:00.000Z') }),
    ]);

    usePromptStore.getState().setFilter({
      favoritesOnly: false,
      recentOnly: false,
      tag: undefined,
    });

    expect(usePromptStore.getState().filteredPrompts.map((prompt) => prompt.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  it('sorts recently modified prompts by updated time from newest to oldest', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('old-edit', { updatedAt: new Date('2025-12-01T00:00:00.000Z') }),
      createPrompt('new-edit', { updatedAt: new Date('2026-03-01T00:00:00.000Z') }),
      createPrompt('middle-edit', { updatedAt: new Date('2026-02-01T00:00:00.000Z') }),
    ]);

    usePromptStore.getState().setFilter({
      favoritesOnly: false,
      recentOnly: true,
      tag: undefined,
    });

    expect(usePromptStore.getState().filteredPrompts.map((prompt) => prompt.id)).toEqual([
      'new-edit',
      'middle-edit',
      'old-edit',
    ]);
  });

  it('sorts favorite prompts by pinned time from newest to oldest', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('old-favorite', {
        pinned: true,
        pinnedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      createPrompt('not-favorite', {
        pinned: false,
        pinnedAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      createPrompt('new-favorite', {
        pinned: true,
        pinnedAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
      createPrompt('middle-favorite', {
        pinned: true,
        pinnedAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ]);

    usePromptStore.getState().setFilter({
      favoritesOnly: true,
      recentOnly: false,
      tag: undefined,
    });

    expect(usePromptStore.getState().filteredPrompts.map((prompt) => prompt.id)).toEqual([
      'new-favorite',
      'middle-favorite',
      'old-favorite',
    ]);
  });

  it('keeps search relevance order instead of resorting by created time', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('tag-match', {
        title: 'Other',
        content: 'No keyword',
        tags: ['alpha'],
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      createPrompt('content-match', {
        title: 'Other',
        content: 'alpha appears in content',
        tags: [],
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
      createPrompt('title-match', {
        title: 'Alpha title',
        content: 'No keyword',
        tags: [],
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      }),
    ]);

    usePromptStore.getState().setFilter({ searchQuery: 'alpha' });
    await usePromptStore.getState().applyFilter();

    expect(usePromptStore.getState().filteredPrompts.map((prompt) => prompt.id)).toEqual([
      'title-match',
      'content-match',
      'tag-match',
    ]);
  });

  it('applies tag filtering on top of search results', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('matching-tag', {
        title: 'Alpha title',
        tags: ['work/ui'],
      }),
      createPrompt('wrong-tag', {
        title: 'Alpha title',
        tags: ['personal'],
      }),
    ]);

    usePromptStore.getState().setFilter({ searchQuery: 'alpha', tag: 'work' });
    await usePromptStore.getState().applyFilter();

    expect(usePromptStore.getState().filteredPrompts.map((prompt) => prompt.id)).toEqual([
      'matching-tag',
    ]);
  });
});
