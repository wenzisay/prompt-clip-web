import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownLiveEditor } from './MarkdownLiveEditor';

describe('MarkdownLiveEditor', () => {
  afterEach(cleanup);

  it('keeps document content when switching modes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownLiveEditor
        value="**bold**"
        onChange={onChange}
        mode="live"
        ariaLabel="Editor"
      />
    );

    await screen.findByTestId('markdown-live-editor');

    rerender(
      <MarkdownLiveEditor
        value="**bold**"
        onChange={onChange}
        mode="source"
        ariaLabel="Editor"
      />
    );

    const editor = screen.getByTestId('markdown-live-editor');
    expect(editor.textContent).toContain('bold');
  });
});
