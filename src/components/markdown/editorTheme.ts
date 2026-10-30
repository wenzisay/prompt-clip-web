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
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
      backgroundColor: 'var(--surface-dim)',
      padding: '0.35em 1em',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-frontmatter-first': {
      borderTopLeftRadius: '0.5em',
      borderTopRightRadius: '0.5em',
      paddingTop: '1em',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-frontmatter-last': {
      borderBottomLeftRadius: '0.5em',
      borderBottomRightRadius: '0.5em',
      paddingBottom: '1em',
      marginBottom: '1em',
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
    '.prompt-markdown-live-editor': {
      '--me-fg': 'var(--fg)',
      '--me-fg-muted': 'var(--muted)',
      '--me-link': 'var(--accent)',
      '--me-font-mono': 'var(--font-mono)',
    },
    '.prompt-markdown-live-editor .cm-md-h1': {
      fontSize: '1.5em',
    },
    '.prompt-markdown-live-editor .cm-md-h2': {
      fontSize: '1.25em',
    },
    '.prompt-markdown-live-editor .cm-md-h3': {
      fontSize: '1.125em',
    },
    '.prompt-markdown-live-editor .cm-md-inline-code': {
      backgroundColor: 'var(--surface-dim)',
      color: 'var(--accent)',
      padding: '0.125em 0.25em',
      borderRadius: '0.25em',
      fontSize: '0.875em',
    },
    '.prompt-markdown-live-editor .cm-md-code-block': {
      backgroundColor: 'transparent',
      fontSize: '0.875em',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-fence-body-line': {
      backgroundColor: 'var(--surface-dim)',
      paddingLeft: '1em',
      paddingRight: '1em',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875em',
      color: 'var(--fg)',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-fence-edge-first': {
      paddingTop: '1em',
      borderTopLeftRadius: '0.5em',
      borderTopRightRadius: '0.5em',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-fence-edge-last': {
      paddingBottom: '1em',
      borderBottomLeftRadius: '0.5em',
      borderBottomRightRadius: '0.5em',
      marginBottom: '1em',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-blockquote-line': {
      borderLeft: '3px solid var(--border-strong)',
      paddingLeft: '1em',
      color: 'var(--muted)',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-list-item-line': {
      paddingLeft: '1.5em',
      position: 'relative',
    },
    '.prompt-markdown-live-editor .cm-line.cm-md-list-item-line .cm-md-list-marker': {
      position: 'relative',
      marginLeft: '-1.5em',
      display: 'inline-block',
      width: '1.5em',
      textAlign: 'center',
    },
    '.prompt-markdown-live-editor .cm-md-task-checkbox': {
      marginRight: '0.35em',
      verticalAlign: 'middle',
      accentColor: 'var(--accent)',
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
