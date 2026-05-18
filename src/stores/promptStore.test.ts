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
});
