import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
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
import { markdownSlashKeymap, removeSlashTrigger, slashSegmentBeforeCursor } from './markdownSlashExtension';
import { MarkdownSlashMenu, type SlashMenuState } from './MarkdownSlashMenu';

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
    const shellRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const lastEmittedRef = useRef(value);
    const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
    const slashMenuRef = useRef(setSlashMenu);
    slashMenuRef.current = setSlashMenu;

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

    const syncSlashMenu = useCallback((view: EditorView) => {
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      const before = line.text.slice(0, pos - line.from);
      const match = slashSegmentBeforeCursor(before);
      if (!match) {
        slashMenuRef.current(null);
        return;
      }
      const coords = view.coordsAtPos(pos);
      const shellRect = shellRef.current?.getBoundingClientRect();
      if (!coords || !shellRect) {
        slashMenuRef.current(null);
        return;
      }
      slashMenuRef.current({
        from: line.from + match.fromOffset,
        to: pos,
        query: match.query,
        top: coords.bottom - shellRect.top + 4,
        left: coords.left - shellRect.left,
      });
    }, []);

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
        markdownSlashKeymap(() => slashMenuRef.current(null)),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            lastEmittedRef.current = next;
            onChange(next);
          }
          if (update.docChanged || update.selectionSet) {
            syncSlashMenu(update.view);
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
      syncSlashMenu(view);

      return () => {
        view.destroy();
        viewRef.current = null;
        slashMenuRef.current(null);
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
      syncSlashMenu(view);
    }, [value, syncSlashMenu]);

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

    const applySlashCommand = useCallback((command: MarkdownInsertCommandId) => {
      const view = viewRef.current;
      if (!view || !slashMenu || disabled) {
        return;
      }
      const doc = view.state.doc.toString();
      const withoutSlash = doc.slice(0, slashMenu.from) + doc.slice(slashMenu.to);
      const { value: next, selection } = applyMarkdownInsert(
        withoutSlash,
        { from: slashMenu.from, to: slashMenu.from },
        command
      );
      view.dispatch({
        changes: { from: 0, to: doc.length, insert: next },
        selection: EditorSelection.range(selection.from, selection.to),
        scrollIntoView: true,
      });
      setSlashMenu(null);
      view.focus();
    }, [disabled, slashMenu]);

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
        <div ref={shellRef} className="relative min-h-0 flex-1">
          <div
            ref={hostRef}
            className="h-full min-h-0 overflow-auto prompt-detail-content"
            data-testid="markdown-live-editor"
          />
          <MarkdownSlashMenu
            locale={locale}
            state={slashMenu}
            onSelect={applySlashCommand}
            onClose={() => {
              setSlashMenu(null);
              const view = viewRef.current;
              if (view) {
                removeSlashTrigger(view);
              }
            }}
          />
        </div>
      </div>
    );
  }
);
