export type MarkdownInsertCommandId =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'inlineCode'
  | 'link'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'codeBlock'
  | 'task';

export interface MarkdownSelection {
  from: number;
  to: number;
}

export interface MarkdownInsertResult {
  value: string;
  selection: MarkdownSelection;
}

function wrapSelection(
  value: string,
  selection: MarkdownSelection,
  before: string,
  after: string,
  placeholder = ''
): MarkdownInsertResult {
  const selected = value.slice(selection.from, selection.to) || placeholder;
  const next =
    value.slice(0, selection.from) + before + selected + after + value.slice(selection.to);
  const from = selection.from + before.length;
  const to = from + selected.length;
  return { value: next, selection: { from, to } };
}

function getLineBounds(value: string, position: number) {
  const lineStart = value.lastIndexOf('\n', position - 1) + 1;
  const lineBreak = value.indexOf('\n', position);
  const lineEndIndex = lineBreak === -1 ? value.length : lineBreak;
  return { lineStart, lineEndIndex };
}

/** Strip common Markdown block markers from the start of a line body. */
export function stripLeadingBlockMarker(text: string): string {
  let rest = text;
  rest = rest.replace(/^#{1,6}\s+/, '');
  rest = rest.replace(/^[-*+]\s+\[[ xX]\]\s+/, '');
  rest = rest.replace(/^[-*+]\s+/, '');
  rest = rest.replace(/^\d+\.\s+/, '');
  rest = rest.replace(/^>\s+/, '');
  return rest;
}

function applyLineBlockPrefix(
  value: string,
  selection: MarkdownSelection,
  prefix: string,
  options: { body?: string; wrapCodeFence?: boolean } = {}
): MarkdownInsertResult {
  const anchor = selection.from;
  const { lineStart, lineEndIndex } = getLineBounds(value, anchor);
  const line = value.slice(lineStart, lineEndIndex);
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);
  const body = options.body ?? '';

  if (!trimmed) {
    const newLine = `${indent}${prefix}${body}`;
    const next = value.slice(0, lineStart) + newLine + value.slice(lineEndIndex);
    const cursor = lineStart + newLine.length;
    return { value: next, selection: { from: cursor, to: cursor } };
  }

  const content = stripLeadingBlockMarker(trimmed);
  let newLine: string;
  if (options.wrapCodeFence) {
    newLine = `${indent}\`\`\`\n${content}\n\`\`\``;
  } else {
    newLine = `${indent}${prefix}${content}`;
  }

  const next = value.slice(0, lineStart) + newLine + value.slice(lineEndIndex);
  const cursor = lineStart + newLine.length;
  return { value: next, selection: { from: cursor, to: cursor } };
}

export function applyMarkdownInsert(
  value: string,
  selection: MarkdownSelection,
  command: MarkdownInsertCommandId
): MarkdownInsertResult {
  switch (command) {
    case 'h1':
      return applyLineBlockPrefix(value, selection, '# ', {});
    case 'h2':
      return applyLineBlockPrefix(value, selection, '## ', {});
    case 'h3':
      return applyLineBlockPrefix(value, selection, '### ', {});
    case 'bold':
      return wrapSelection(value, selection, '**', '**', 'text');
    case 'italic':
      return wrapSelection(value, selection, '*', '*', 'text');
    case 'inlineCode':
      return wrapSelection(value, selection, '`', '`', 'code');
    case 'link':
      return wrapSelection(value, selection, '[', '](url)', 'label');
    case 'ul':
      return applyLineBlockPrefix(value, selection, '- ', {});
    case 'ol':
      return applyLineBlockPrefix(value, selection, '1. ', {});
    case 'quote':
      return applyLineBlockPrefix(value, selection, '> ', {});
    case 'codeBlock':
      return applyLineBlockPrefix(value, selection, '```\n', {
        body: '\n```',
        wrapCodeFence: true,
      });
    case 'task':
      return applyLineBlockPrefix(value, selection, '- [ ] ', {});
    default:
      return { value, selection };
  }
}
