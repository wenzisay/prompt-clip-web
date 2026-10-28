import {
  autocompletion,
  closeCompletion,
  completionKeymap,
  completionStatus,
  startCompletion,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { EditorSelection } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import { applyMarkdownInsert } from './markdownInsert';
import { MARKDOWN_SLASH_COMMANDS } from './markdownSlashCommands';

const SLASH_SEGMENT = /^\/[\w-]*$/;

function slashSegmentBeforeCursor(before: string): { fromOffset: number; query: string } | null {
  const slashIndex = before.lastIndexOf('/');
  if (slashIndex === -1) {
    return null;
  }
  const segment = before.slice(slashIndex);
  if (!SLASH_SEGMENT.test(segment)) {
    return null;
  }
  if (slashIndex > 0 && !/\s/.test(before[slashIndex - 1]!)) {
    return null;
  }
  return { fromOffset: slashIndex, query: segment.slice(1).toLowerCase() };
}

function slashMatch(context: CompletionContext, locale: Locale) {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = slashSegmentBeforeCursor(before);
  if (!match) {
    return null;
  }

  const from = line.from + match.fromOffset;
  const t = messages[locale].markdownEditor.slash;

  const options: Completion[] = MARKDOWN_SLASH_COMMANDS
    .filter((command) => {
      const label = t[command.labelKey].toLowerCase();
      return !match.query || label.includes(match.query) || command.id.includes(match.query);
    })
    .map((command) => ({
      label: t[command.labelKey],
      type: 'keyword',
      apply: (view: EditorView, _completion: Completion, fromPos: number, toPos: number) => {
        const value = view.state.doc.toString();
        const withoutSlash = value.slice(0, fromPos) + value.slice(toPos);
        const { value: next, selection } = applyMarkdownInsert(
          withoutSlash,
          { from: fromPos, to: fromPos },
          command.id
        );
        view.dispatch({
          changes: { from: 0, to: value.length, insert: next },
          selection: EditorSelection.range(selection.from, selection.to),
          scrollIntoView: true,
        });
      },
    }));

  if (options.length === 0) {
    return {
      from,
      to: context.pos,
      options: [
        {
          label: t.noMatch,
          type: 'text',
          apply: () => undefined,
        },
      ],
    };
  }

  return { from, to: context.pos, options, validFor: SLASH_SEGMENT };
}

export function markdownSlashExtension(locale: Locale): Extension[] {
  return [
    autocompletion({
      activateOnTyping: true,
      activateOnTypingDelay: 0,
      override: [(context) => slashMatch(context, locale)],
      defaultKeymap: true,
      closeOnBlur: true,
      maxRenderedOptions: 20,
    }),
    keymap.of([
      {
        key: '/',
        run(view) {
          queueMicrotask(() => startCompletion(view));
          return false;
        },
      },
      {
        key: 'Escape',
        run(view) {
          if (completionStatus(view.state) !== null) {
            closeCompletion(view);
            return true;
          }
          return removeSlashTrigger(view);
        },
      },
      ...completionKeymap,
    ]),
  ];
}

export function removeSlashTrigger(view: EditorView): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  const match = slashSegmentBeforeCursor(before);
  if (!match) {
    return false;
  }
  const from = line.from + match.fromOffset;
  view.dispatch({
    changes: { from, to: pos, insert: '' },
    selection: { anchor: from },
  });
  return true;
}
