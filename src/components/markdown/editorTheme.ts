import { EditorView } from '@codemirror/view';
import { defaultTheme } from '@fedoup/markdown-editor';

export const promptClipEditorTheme = [
  defaultTheme,
  EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.5',
    },
    '.cm-content': {
      padding: '12px 16px',
    },
    '.cm-line.cm-frontmatter-line': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '13px',
    },
  }),
  EditorView.baseTheme({
    '.prompt-markdown-live-editor .cm-editor': {
      borderRadius: '0.5rem',
      border: '1px solid var(--border-strong, var(--border))',
      backgroundColor: 'var(--surface-container)',
    },
    '.prompt-markdown-live-editor .cm-editor.cm-focused': {
      outline: '2px solid var(--accent-soft)',
      borderColor: 'var(--accent)',
    },
    '.prompt-markdown-live-editor--disabled .cm-editor': {
      opacity: '0.6',
      pointerEvents: 'none',
    },
    '.prompt-markdown-live-editor .cm-tooltip.cm-tooltip-autocomplete': {
      zIndex: '80',
    },
    '.cm-md-table': {
      display: 'block',
      width: '100%',
      padding: '0.25em 0 0.75em',
      cursor: 'text',
      overflowX: 'auto',
    },
    '.cm-md-table table': {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.9375rem',
      lineHeight: '1.5',
    },
    '.cm-md-table th': {
      border: '1px solid var(--border)',
      padding: '0.5em 0.65em',
      textAlign: 'left',
      verticalAlign: 'top',
      backgroundColor: 'var(--surface-dim)',
      fontWeight: '600',
    },
    '.cm-md-table td': {
      border: '1px solid var(--border)',
      padding: '0.5em 0.65em',
      textAlign: 'left',
      verticalAlign: 'top',
    },
    '.cm-md-table th[align="center"]': {
      textAlign: 'center',
    },
    '.cm-md-table td[align="center"]': {
      textAlign: 'center',
    },
    '.cm-md-table th[align="right"]': {
      textAlign: 'right',
    },
    '.cm-md-table td[align="right"]': {
      textAlign: 'right',
    },
    '.cm-md-table a': {
      color: 'var(--accent)',
      textDecoration: 'underline',
    },
    '.cm-md-table code': {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '0.9em',
    },
  }),
];
