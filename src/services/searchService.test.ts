import { beforeEach, describe, expect, it } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { SearchService } from './searchService';

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

describe('SearchService', () => {
  beforeEach(() => {
    SearchService.clearSearchIndex();
  });

  it('searches title, content, and tags using weighted relevance', async () => {
    await SearchService.buildSearchIndex([
      createPrompt('tag-match', { tags: ['alpha'] }),
      createPrompt('content-match', { content: 'alpha appears in content' }),
      createPrompt('title-match', { title: 'Alpha title' }),
    ]);

    const results = await SearchService.search('alpha');

    expect(results.map((prompt) => prompt.id)).toEqual([
      'title-match',
      'content-match',
      'tag-match',
    ]);
  });

  it('removes stale content when rebuilding the full index', async () => {
    await SearchService.buildSearchIndex([
      createPrompt('same-id', { title: 'Alpha title' }),
    ]);
    await SearchService.buildSearchIndex([
      createPrompt('same-id', { title: 'Beta title' }),
    ]);

    await expect(SearchService.search('alpha')).resolves.toEqual([]);
    await expect(SearchService.search('beta')).resolves.toHaveLength(1);
  });

  it('builds a title/tags-only index when skipContent is true', async () => {
    await SearchService.buildSearchIndex(
      [
        createPrompt('by-title', { title: 'Alpha title' }),
        createPrompt('by-tag', { tags: ['alpha'] }),
        createPrompt('by-content', { content: 'alpha in body' }),
      ],
      { skipContent: true }
    );

    const results = await SearchService.search('alpha');
    const ids = results.map((prompt) => prompt.id).sort();
    expect(ids).toEqual(['by-tag', 'by-title'].sort());
  });

  it('adds content to the index incrementally via addContentToIndex', async () => {
    await SearchService.buildSearchIndex(
      [createPrompt('p1', { content: 'old body' })],
      { skipContent: true }
    );
    await expect(SearchService.search('hidden')).resolves.toEqual([]);

    SearchService.addContentToIndex('p1', 'this is the new body with hidden token');

    const results = await SearchService.search('hidden');
    expect(results.map((prompt) => prompt.id)).toEqual(['p1']);
  });
});
