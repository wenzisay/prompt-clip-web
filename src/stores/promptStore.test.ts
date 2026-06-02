import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    preview: '',
    isContentLoaded: true,
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

describe('usePromptStore.patchPromptContent', () => {
  beforeEach(() => {
    usePromptStore.getState().clearPrompts();
  });

  it('patches a prompt content without changing filtered order or triggering applyFilter', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('a', {
        content: '',
        isContentLoaded: false,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      createPrompt('b', {
        content: '',
        isContentLoaded: false,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ]);

    const filteredBefore = usePromptStore.getState().filteredPrompts;
    const applyFilterSpy = vi.spyOn(usePromptStore.getState(), 'applyFilter');

    usePromptStore.getState().patchPromptContent('b', 'Full body of b');

    expect(applyFilterSpy).not.toHaveBeenCalled();
    const updated = usePromptStore.getState().prompts.find((p) => p.id === 'b');
    expect(updated?.content).toBe('Full body of b');
    expect(updated?.isContentLoaded).toBe(true);
    // 顺序保持（不影响 filteredPrompts 引用）
    expect(usePromptStore.getState().filteredPrompts.map((p) => p.id)).toEqual(filteredBefore.map((p) => p.id));
  });

  it('also updates indexedPrompts-like references inside filteredPrompts', async () => {
    await usePromptStore.getState().setPrompts([
      createPrompt('p1', { content: '', isContentLoaded: false }),
    ]);

    usePromptStore.getState().patchPromptContent('p1', 'Hello world');

    const inFiltered = usePromptStore.getState().filteredPrompts.find((p) => p.id === 'p1');
    expect(inFiltered?.content).toBe('Hello world');
    expect(inFiltered?.isContentLoaded).toBe(true);
  });
});
