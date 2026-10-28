import { keymap } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

const SLASH_SEGMENT = /^\/[\w-]*$/;

export function slashSegmentBeforeCursor(before: string): { fromOffset: number; query: string } | null {
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

export function markdownSlashKeymap(onDismiss: () => void): Extension {
  return keymap.of([
    {
      key: 'Escape',
      run: (view) => {
        onDismiss();
        return removeSlashTrigger(view);
      },
    },
  ]);
}
