import type { MarkdownInsertCommandId } from './markdownInsert';

type SlashLabelKey =
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

export const MARKDOWN_SLASH_COMMANDS: Array<{
  id: MarkdownInsertCommandId;
  labelKey: SlashLabelKey;
}> = [
  { id: 'h1', labelKey: 'h1' },
  { id: 'h2', labelKey: 'h2' },
  { id: 'h3', labelKey: 'h3' },
  { id: 'bold', labelKey: 'bold' },
  { id: 'italic', labelKey: 'italic' },
  { id: 'inlineCode', labelKey: 'inlineCode' },
  { id: 'link', labelKey: 'link' },
  { id: 'ul', labelKey: 'ul' },
  { id: 'ol', labelKey: 'ol' },
  { id: 'quote', labelKey: 'quote' },
  { id: 'codeBlock', labelKey: 'codeBlock' },
  { id: 'task', labelKey: 'task' },
];
