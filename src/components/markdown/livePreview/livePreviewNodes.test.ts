import { markdown } from '@codemirror/lang-markdown';
import { forceParsing } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Table, TaskList } from '@lezer/markdown';
import { afterEach, describe, expect, it } from 'vitest';
import { livePreviewPlugin } from './livePreviewPlugin';

const views: EditorView[] = [];

function editor(doc: string, cursor: number, protectFrontmatter = false): EditorView {
  const parent = document.createElement('div');
  parent.className = 'prompt-markdown-live-editor';
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(cursor),
      extensions: [
        markdown({ extensions: [Table, TaskList] }),
        livePreviewPlugin({ protectFrontmatter }),
        EditorView.lineWrapping,
      ],
    }),
  });
  forceParsing(view);
  views.push(view);
  return view;
}

afterEach(() => {
  for (const view of views) {
    view.dom.remove();
    view.destroy();
  }
  views.length = 0;
});

describe('live preview prose alignment', () => {
  it('styles blockquote lines and hides quote marks off the active line', () => {
    const doc = '> quoted line\n\nbody';
    const view = editor(doc, doc.length);
    expect(view.contentDOM.querySelector('.cm-md-blockquote-line')).toBeTruthy();
    expect(view.contentDOM.textContent).toContain('quoted line');
    expect(view.contentDOM.textContent).not.toMatch(/^>\s/m);
  });

  it('renders task list checkboxes on preview lines', () => {
    const doc = '- [ ] todo\n- [x] done\n\n';
    const view = editor(doc, doc.length);
    const boxes = view.contentDOM.querySelectorAll('.cm-md-task-checkbox');
    expect(boxes.length).toBe(2);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    expect((boxes[1] as HTMLInputElement).checked).toBe(true);
    expect(view.contentDOM.textContent).toContain('todo');
    expect(view.contentDOM.textContent).toContain('done');
  });

  it('indents bullet list item lines', () => {
    const view = editor('- alpha\n- beta', 3);
    expect(view.contentDOM.querySelectorAll('.cm-md-list-item-line').length).toBe(2);
  });

  it('applies fenced code block body line styling', () => {
    const view = editor('```\nline one\nline two\n```', 5);
    expect(view.contentDOM.querySelectorAll('.cm-line.cm-md-fence-body-line').length).toBeGreaterThan(0);
  });

  it('marks frontmatter lines as protected monospace blocks', () => {
    const doc = '---\ntitle: Demo\n---\n\n# Body';
    const view = editor(doc, doc.length, true);
    expect(view.contentDOM.querySelectorAll('.cm-frontmatter-line').length).toBe(4);
    expect(view.contentDOM.querySelector('.cm-md-frontmatter-first')).toBeTruthy();
    expect(view.contentDOM.querySelector('.cm-md-frontmatter-last')).toBeTruthy();
  });
});
