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
  }),
];
