import { autocompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import { applyMarkdownInsert } from './markdownInsert';
import { MARKDOWN_SLASH_COMMANDS } from './markdownSlashCommands';

const SLASH_PATTERN = /\/[\w-]*$/;

function slashMatch(context: CompletionContext, locale: Locale) {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const match = before.match(SLASH_PATTERN);
  if (!match) {
    return null;
  }

  const query = match[0].slice(1).toLowerCase();
  const from = context.pos - match[0].length;
  const t = messages[locale].markdownEditor.slash;

  const options: Completion[] = MARKDOWN_SLASH_COMMANDS
    .filter((command) => {
      const label = t[command.labelKey].toLowerCase();
      return !query || label.includes(query) || command.id.includes(query);
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

  return { from, to: context.pos, options, validFor: SLASH_PATTERN };
}

export function markdownSlashExtension(locale: Locale) {
  return autocompletion({
    activateOnTyping: true,
    override: [(context) => slashMatch(context, locale)],
    defaultKeymap: true,
    closeOnBlur: true,
  });
}

export function removeSlashTrigger(view: EditorView): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  const match = before.match(SLASH_PATTERN);
  if (!match) {
    return false;
  }
  const from = pos - match[0].length;
  view.dispatch({
    changes: { from, to: pos, insert: '' },
    selection: { anchor: from },
  });
  return true;
}
