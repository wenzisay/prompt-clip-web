import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DeletedPrompt } from '@/types/prompt';
import { RecycleCard } from './RecycleCard';
import { RecycleList } from './RecycleList';

function makeDeleted(overrides: Partial<DeletedPrompt> = {}): DeletedPrompt {
  return {
    trashBase: '12345678901234567.2025-01-15-103045',
    filePath: '_promptclip/.trash/12345678901234567.2025-01-15-103045.md',
    title: '客服回复 Prompt',
    preview: '你好，请问有什么可以帮您？',
    deletedAt: new Date(2025, 0, 15, 10, 30, 45),
    hasAnnotations: false,
    ...overrides,
  };
}

describe('RecycleCard', () => {
  it('renders title, deletion date, and preview', () => {
    const markup = renderToStaticMarkup(
      <RecycleCard
        deleted={makeDeleted()}
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).toContain('客服回复 Prompt');
    expect(markup).toContain('你好，请问有什么可以帮您？');
    expect(markup).toContain('查看');
    expect(markup).toContain('恢复');
    expect(markup).toContain('永久删除');
  });

  it('shows annotation badge when hasAnnotations is true', () => {
    const markup = renderToStaticMarkup(
      <RecycleCard
        deleted={makeDeleted({ hasAnnotations: true })}
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).toContain('含批注');
  });

  it('hides annotation badge when hasAnnotations is false', () => {
    const markup = renderToStaticMarkup(
      <RecycleCard
        deleted={makeDeleted({ hasAnnotations: false })}
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).not.toContain('含批注');
  });

  it('renders en-US locale strings', () => {
    const markup = renderToStaticMarkup(
      <RecycleCard
        deleted={makeDeleted()}
        locale="en-US"
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).toContain('View');
    expect(markup).toContain('Restore');
    expect(markup).toContain('Delete Permanently');
  });
});

describe('RecycleList', () => {
  it('renders empty state when no items', () => {
    const markup = renderToStaticMarkup(
      <RecycleList
        items={[]}
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).toContain('回收站为空');
  });

  it('renders multiple cards when items exist', () => {
    const items = [
      makeDeleted({ trashBase: 'a.2025-01-01-000000.md', title: '标题 A' }),
      makeDeleted({ trashBase: 'b.2025-02-01-000000.md', title: '标题 B' }),
    ];

    const markup = renderToStaticMarkup(
      <RecycleList
        items={items}
        onView={() => undefined}
        onRestore={() => undefined}
        onPermanentDelete={() => undefined}
      />
    );

    expect(markup).toContain('标题 A');
    expect(markup).toContain('标题 B');
  });
});
