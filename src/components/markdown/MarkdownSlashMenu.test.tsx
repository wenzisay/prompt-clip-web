import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownSlashMenu } from './MarkdownSlashMenu';

describe('MarkdownSlashMenu', () => {
  it('lists slash commands for the current query', () => {
    render(
      <MarkdownSlashMenu
        locale="en-US"
        state={{ from: 0, to: 1, query: '', top: 0, left: 0 }}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('listbox', { name: 'Slash insert commands' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Heading 1' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Task list' })).toBeTruthy();
  });
});
