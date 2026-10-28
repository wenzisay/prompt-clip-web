import { markdown } from '@codemirror/lang-markdown';
import { forceParsing } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Table } from '@lezer/markdown';
import { afterEach, describe, expect, it } from 'vitest';
import { livePreviewPlugin } from '../livePreviewPlugin';

const views: EditorView[] = [];

function editor(doc: string, cursor: number): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(cursor),
      extensions: [
        markdown({ extensions: Table }),
        livePreviewPlugin(),
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

const tableDoc = [
  'Intro',
  '',
  '| Name | Role |',
  '| --- | --- |',
  '| Ada | Eng |',
  '',
  'Outro',
].join('\n');

describe('live preview tables', () => {
  it('renders a table when the cursor is outside the table and keeps the source', () => {
    const view = editor(tableDoc, tableDoc.indexOf('Outro'));

    const table = view.contentDOM.querySelector('.cm-md-table table');
    expect(table).toBeTruthy();
    expect(table?.textContent).toContain('Name');
    expect(table?.textContent).toContain('Ada');
    expect(view.contentDOM.textContent).not.toContain('| --- |');
    expect(view.state.doc.toString()).toBe(tableDoc);
  });

  it('shows the raw table when the cursor is inside it', () => {
    const view = editor(tableDoc, tableDoc.indexOf('| Ada'));

    expect(view.contentDOM.querySelector('.cm-md-table')).toBeNull();
    expect(view.contentDOM.textContent).toContain('| Name | Role |');
    expect(view.contentDOM.textContent).toContain('| Ada | Eng |');
    expect(view.state.doc.toString()).toBe(tableDoc);
  });

  it('renders the table again after the cursor leaves', () => {
    const view = editor(tableDoc, tableDoc.indexOf('| Ada'));

    view.dispatch({
      selection: EditorSelection.cursor(tableDoc.indexOf('Outro')),
    });

    expect(view.contentDOM.querySelector('.cm-md-table table')?.textContent).toContain('Ada');
    expect(view.contentDOM.textContent).not.toContain('| --- |');
    expect(view.state.doc.toString()).toBe(tableDoc);
  });

  it('turns the clicked row back into source without changing the document', () => {
    const view = editor(tableDoc, tableDoc.indexOf('Outro'));
    const rows = view.contentDOM.querySelectorAll('.cm-md-table tr');

    rows[1]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(view.state.doc.lineAt(view.state.selection.main.head).text).toBe('| Ada | Eng |');
    expect(view.contentDOM.querySelector('.cm-md-table')).toBeNull();
    expect(view.contentDOM.textContent).toContain('| Ada | Eng |');
    expect(view.state.doc.toString()).toBe(tableDoc);
  });

  it('keeps pipe text as source when it is not a table', () => {
    const doc = 'Intro\n\n| not | table |\n\nOutro';
    const view = editor(doc, doc.indexOf('Outro'));

    expect(view.contentDOM.querySelector('table')).toBeNull();
    expect(view.contentDOM.textContent).toContain('| not | table |');
  });

  it('renders only the tables the cursor is outside of', () => {
    const doc = ['| A |', '| --- |', '| 1 |', '', 'middle', '', '| B |', '| --- |', '| 2 |'].join('\n');
    const view = editor(doc, doc.indexOf('| 2'));
    const tables = view.contentDOM.querySelectorAll('.cm-md-table');

    expect(tables).toHaveLength(1);
    expect(tables[0]?.textContent).toContain('1');
    expect(view.contentDOM.textContent).toContain('| 2 |');
  });

  it('keeps column alignment from the delimiter row', () => {
    const doc = 'x\n\n| L | R |\n| :--- | ---: |\n| a | b |\n';
    const view = editor(doc, 0);

    expect(view.contentDOM.querySelector('th[align="right"]')?.textContent).toBe('R');
    expect(view.contentDOM.querySelector('td[align="left"]')?.textContent).toBe('a');
  });
});
