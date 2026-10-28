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

function insertBlockPrefix(
  value: string,
  selection: MarkdownSelection,
  prefix: string,
  body = ''
): MarkdownInsertResult {
  const lineStart = value.lastIndexOf('\n', selection.from - 1) + 1;
  const lineEnd = value.indexOf('\n', selection.from);
  const lineEndIndex = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, lineEndIndex);
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  if (trimmed.length > 0) {
    const insert = `\n\n${prefix}${body}`;
    const at = lineEndIndex;
    const next = value.slice(0, at) + insert + value.slice(at);
    const cursor = at + insert.length;
    return { value: next, selection: { from: cursor, to: cursor } };
  }

  const next =
    value.slice(0, lineStart) + indent + prefix + body + value.slice(lineEndIndex);
  const cursor = lineStart + indent.length + prefix.length + body.length;
  return { value: next, selection: { from: cursor, to: cursor } };
}

export function applyMarkdownInsert(
  value: string,
  selection: MarkdownSelection,
  command: MarkdownInsertCommandId
): MarkdownInsertResult {
  switch (command) {
    case 'h1':
      return insertBlockPrefix(value, selection, '# ', '');
    case 'h2':
      return insertBlockPrefix(value, selection, '## ', '');
    case 'h3':
      return insertBlockPrefix(value, selection, '### ', '');
    case 'bold':
      return wrapSelection(value, selection, '**', '**', 'text');
    case 'italic':
      return wrapSelection(value, selection, '*', '*', 'text');
    case 'inlineCode':
      return wrapSelection(value, selection, '`', '`', 'code');
    case 'link':
      return wrapSelection(value, selection, '[', '](url)', 'label');
    case 'ul':
      return insertBlockPrefix(value, selection, '- ', '');
    case 'ol':
      return insertBlockPrefix(value, selection, '1. ', '');
    case 'quote':
      return insertBlockPrefix(value, selection, '> ', '');
    case 'codeBlock':
      return insertBlockPrefix(value, selection, '```\n', '\n```');
    case 'task':
      return insertBlockPrefix(value, selection, '- [ ] ', '');
    default:
      return { value, selection };
  }
}
