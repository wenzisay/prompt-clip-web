import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkdownLiveEditor } from './MarkdownLiveEditor';

function getEditorView(): EditorView {
  const host = screen.getByTestId('markdown-live-editor');
  return EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
}

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

  it.each(['live', 'source'] as const)('wraps the selected paragraphs from the toolbar in %s mode', async (mode) => {
    const value = 'Before\n\nfirst\n\nsecond\n\nAfter';
    const onChange = vi.fn();
    render(<MarkdownLiveEditor value={value} onChange={onChange} mode={mode} ariaLabel="Editor" />);
    const view = getEditorView();
    const from = value.indexOf('first');
    const to = value.indexOf('\n\nAfter');
    act(() => {
      view.dispatch({ selection: EditorSelection.range(to, from) });
      view.focus();
    });

    await userEvent.click(screen.getByRole('button', { name: '代码块' }));

    expect(onChange).toHaveBeenLastCalledWith('Before\n\n```\nfirst\n\nsecond\n```\n\nAfter');
    const selection = view.state.selection.main;
    expect(view.state.sliceDoc(selection.from, selection.to)).toBe('first\n\nsecond');
    expect(view.state.selection.main.head).toBeLessThan(view.state.selection.main.anchor);
  });

  it('keeps focus and the selection in the editor when pressing a toolbar button', () => {
    render(<MarkdownLiveEditor value="one\ntwo" onChange={vi.fn()} mode="live" ariaLabel="Editor" />);
    const view = getEditorView();
    act(() => {
      view.dispatch({ selection: EditorSelection.range(0, 7) });
      view.focus();
    });

    const allowedDefault = fireEvent.mouseDown(screen.getByRole('button', { name: '代码块' }));

    expect(allowedDefault).toBe(false);
    expect(document.activeElement).toBe(view.contentDOM);
  });

  it('preserves positions outside the formatted range', () => {
    const value = 'Before\n\nselected\n\nAfter';
    render(<MarkdownLiveEditor value={value} onChange={vi.fn()} mode="source" ariaLabel="Editor" />);
    const view = getEditorView();
    const dispatch = vi.spyOn(view, 'dispatch');
    act(() => view.dispatch({ selection: EditorSelection.range(8, 16) }));
    const stateBeforeFormatting = view.state;
    dispatch.mockClear();

    fireEvent.click(screen.getByRole('button', { name: '加粗' }));

    const changes = stateBeforeFormatting.changes(dispatch.mock.calls[0][0].changes);
    expect(changes.mapPos(3)).toBe(3);
    expect(changes.mapPos(value.indexOf('After'))).toBe(value.indexOf('After') + 4);
  });

  it('keeps an external shortened value and a valid caret position', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MarkdownLiveEditor value="long content" onChange={onChange} mode="source" ariaLabel="Editor" />);
    const view = getEditorView();
    act(() => view.dispatch({ selection: { anchor: 12 } }));

    rerender(<MarkdownLiveEditor value="short" onChange={onChange} mode="source" ariaLabel="Editor" />);

    expect(view.state.doc.toString()).toBe('short');
    expect(view.state.selection.main.head).toBeLessThanOrEqual(5);
  });
});
