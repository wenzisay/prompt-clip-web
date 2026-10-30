import { EditorView } from '@codemirror/view';
import { defaultTheme } from '@fedoup/markdown-editor';

/**
 * Editor chrome only. Live Preview markdown styles live in index.css under
 * `.prompt-markdown-live-editor` — CM6 theme selectors are scoped inside
 * `.cm-editor` and cannot see that outer wrapper class.
 */
export const promptClipEditorTheme = [
  defaultTheme,
  EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--surface)',
      color: 'var(--fg)',
      fontSize: '0.9375rem',
      borderRadius: '0.5rem',
      border: '1px solid var(--border-strong, var(--border))',
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.03)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--accent-soft)',
      borderColor: 'var(--accent)',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.65',
    },
    '.cm-content': {
      padding: '1rem',
      caretColor: 'var(--fg)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
      zIndex: '80',
    },
  }),
];
