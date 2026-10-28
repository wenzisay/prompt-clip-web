import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState, Compartment, EditorSelection } from '@codemirror/state';
import {
  EditorView,
  keymap,
  placeholder as cmPlaceholder,
  Decoration,
  ViewPlugin,
} from '@codemirror/view';
import { cursorEscapeFilter } from '@fedoup/markdown-editor';
import '@fedoup/markdown-editor/styles.css';
import type { Locale } from '@/i18n';
import { getFrontmatterProtectedLineNumbers } from './frontmatter';
import { promptClipEditorTheme } from './editorTheme';
import { livePreviewPlugin } from './livePreview/livePreviewPlugin';
import { MarkdownFormatToolbar } from './MarkdownFormatToolbar';
import { applyMarkdownInsert, type MarkdownInsertCommandId } from './markdownInsert';
import { markdownSlashExtension, removeSlashTrigger } from './markdownSlashExtension';

export type MarkdownEditorMode = 'live' | 'source';

export interface MarkdownLiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: MarkdownEditorMode;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  locale?: Locale;
  protectFrontmatter?: boolean;
  showToolbar?: boolean;
}

export interface MarkdownLiveEditorHandle {
  focus: () => void;
  getValue: () => string;
}

const modeCompartment = new Compartment();
const editableCompartment = new Compartment();
function frontmatterLinePlugin(protectFrontmatter: boolean) {
  if (!protectFrontmatter) {
    return [];
  }
  return ViewPlugin.fromClass(
    class {
      decorations = Decoration.none;
      update(update: { docChanged: boolean; view: EditorView }) {
        if (!update.docChanged && this.decorations !== Decoration.none) {
          return;
        }
        const lines = getFrontmatterProtectedLineNumbers(update.view.state.doc.toString());
        const ranges = [];
        for (const lineNumber of lines) {
          const line = update.view.state.doc.line(lineNumber);
          ranges.push(Decoration.line({ class: 'cm-frontmatter-line' }).range(line.from));
        }
        this.decorations = Decoration.set(ranges, true);
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
}

export const MarkdownLiveEditor = forwardRef<MarkdownLiveEditorHandle, MarkdownLiveEditorProps>(
  function MarkdownLiveEditor(
    {
      value,
      onChange,
      mode,
      disabled = false,
      ariaLabel,
      className = '',
      placeholder,
      locale = 'zh-CN',
      protectFrontmatter = false,
      showToolbar = true,
    },
    ref
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const lastEmittedRef = useRef(value);
    const localeRef = useRef(locale);
    localeRef.current = locale;

    const livePreviewOptions = useMemo(
      () => ({ protectFrontmatter }),
      [protectFrontmatter]
    );

    const buildLiveExtensions = useCallback(
      () => [
        livePreviewPlugin(livePreviewOptions),
        cursorEscapeFilter(),
        frontmatterLinePlugin(protectFrontmatter),
      ],
      [livePreviewOptions, protectFrontmatter]
    );

    useEffect(() => {
      if (!hostRef.current) {
        return undefined;
      }

      const startExtensions = [
        history(),
        markdown(),
        EditorView.lineWrapping,
        ...promptClipEditorTheme,
        modeCompartment.of(buildLiveExtensions()),
        editableCompartment.of(EditorView.editable.of(!disabled)),
        markdownSlashExtension(localeRef.current),
        keymap.of([
          {
            key: 'Escape',
            run: (view) => removeSlashTrigger(view),
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            lastEmittedRef.current = next;
            onChange(next);
          }
        }),
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ];

      const state = EditorState.create({
        doc: value,
        extensions: startExtensions,
      });

      const view = new EditorView({ state, parent: hostRef.current });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; sync via effects
    }, []);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      view.dispatch({
        effects: modeCompartment.reconfigure(
          mode === 'live' ? buildLiveExtensions() : []
        ),
      });
    }, [mode, buildLiveExtensions]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      view.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
      });
    }, [disabled]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      const current = view.state.doc.toString();
      if (value === current || value === lastEmittedRef.current) {
        return;
      }
      const selection = view.state.selection;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        selection,
      });
      lastEmittedRef.current = value;
    }, [value]);

    const runInsert = useCallback((command: MarkdownInsertCommandId) => {
      const view = viewRef.current;
      if (!view || disabled) {
        return;
      }
      const doc = view.state.doc.toString();
      const { from, to } = view.state.selection.main;
      const { value: next, selection } = applyMarkdownInsert(doc, { from, to }, command);
      view.dispatch({
        changes: { from: 0, to: doc.length, insert: next },
        selection: EditorSelection.range(selection.from, selection.to),
        scrollIntoView: true,
      });
      view.focus();
    }, [disabled]);

    useImperativeHandle(ref, () => ({
      focus: () => viewRef.current?.focus(),
      getValue: () => viewRef.current?.state.doc.toString() ?? value,
    }));

    const rootClass = [
      'prompt-markdown-live-editor flex min-h-0 flex-1 flex-col gap-2',
      disabled ? 'prompt-markdown-live-editor--disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={rootClass} role="group" aria-label={ariaLabel}>
        {showToolbar && (
          <MarkdownFormatToolbar
            locale={locale}
            disabled={disabled}
            onCommand={runInsert}
          />
        )}
        <div
          ref={hostRef}
          className="min-h-0 flex-1 overflow-hidden prompt-detail-content"
          data-testid="markdown-live-editor"
        />
      </div>
    );
  }
);
