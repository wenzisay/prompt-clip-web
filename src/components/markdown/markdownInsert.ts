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
  prefix: string
): MarkdownInsertResult {
  const anchor = selection.from;
  const { lineStart, lineEndIndex } = getLineBounds(value, anchor);
  const line = value.slice(lineStart, lineEndIndex);
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  if (!trimmed) {
    const newLine = `${indent}${prefix}`;
    const next = value.slice(0, lineStart) + newLine + value.slice(lineEndIndex);
    const cursor = lineStart + newLine.length;
    return { value: next, selection: { from: cursor, to: cursor } };
  }

  const content = stripLeadingBlockMarker(trimmed);
  const newLine = `${indent}${prefix}${content}`;

  const next = value.slice(0, lineStart) + newLine + value.slice(lineEndIndex);
  const cursor = lineStart + newLine.length;
  return { value: next, selection: { from: cursor, to: cursor } };
}

function wrapCodeBlock(value: string, selection: MarkdownSelection): MarkdownInsertResult {
  let { from, to } = selection;
  if (from === to) {
    const bounds = getLineBounds(value, from);
    from = bounds.lineStart;
    to = bounds.lineEndIndex;
  }

  const selected = value.slice(from, to);
  // A surrounding fence must be longer than any fence in the selected code.
  const backticks = selected.match(/`{3,}/g) ?? [];
  const fenceLength = backticks.reduce((length, run) => Math.max(length, run.length + 1), 3);
  const fence = '`'.repeat(fenceLength);
  const leadingBreak = from > 0 && value[from - 1] !== '\n' ? '\n' : '';
  const trailingBreak = to < value.length && value[to] !== '\n' ? '\n' : '';
  const before = `${leadingBreak}${fence}\n`;
  const after = `${selected.endsWith('\n') ? '' : '\n'}${fence}${trailingBreak}`;

  return wrapSelection(value, { from, to }, before, after);
}

export function applyMarkdownInsert(
  value: string,
  selection: MarkdownSelection,
  command: MarkdownInsertCommandId
): MarkdownInsertResult {
  switch (command) {
    case 'h1':
      return applyLineBlockPrefix(value, selection, '# ');
    case 'h2':
      return applyLineBlockPrefix(value, selection, '## ');
    case 'h3':
      return applyLineBlockPrefix(value, selection, '### ');
    case 'bold':
      return wrapSelection(value, selection, '**', '**', 'text');
    case 'italic':
      return wrapSelection(value, selection, '*', '*', 'text');
    case 'inlineCode':
      return wrapSelection(value, selection, '`', '`', 'code');
    case 'link':
      return wrapSelection(value, selection, '[', '](url)', 'label');
    case 'ul':
      return applyLineBlockPrefix(value, selection, '- ');
    case 'ol':
      return applyLineBlockPrefix(value, selection, '1. ');
    case 'quote':
      return applyLineBlockPrefix(value, selection, '> ');
    case 'codeBlock':
      return wrapCodeBlock(value, selection);
    case 'task':
      return applyLineBlockPrefix(value, selection, '- [ ] ');
    default:
      return { value, selection };
  }
}
