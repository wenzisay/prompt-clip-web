import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DeletedPrompt } from '@/types/prompt';
import { RecycleDetailDrawer } from './RecycleDetailDrawer';

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

describe('RecycleDetailDrawer', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the detail view as a right-side drawer above the recycle modal', () => {
    render(<RecycleDetailDrawer deleted={makeDeleted()} onClose={() => undefined} />);

    const dialog = screen.getByRole('dialog');

    expect(dialog.className).toContain('right-0');
    expect(dialog.className).toContain('h-full');
    expect(dialog.style.zIndex).toBe('60');
    expect(screen.getByRole('heading', { name: '客服回复 Prompt' })).toBeTruthy();
  });
});
