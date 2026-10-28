import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import type { MarkdownInsertCommandId } from './markdownInsert';

export interface MarkdownFormatToolbarProps {
  locale?: Locale;
  disabled?: boolean;
  onCommand: (command: MarkdownInsertCommandId) => void;
  className?: string;
}

const TOOLBAR_ITEMS: Array<{
  id: MarkdownInsertCommandId;
  icon: string;
  labelKey: keyof typeof messages['zh-CN']['markdownEditor']['toolbar'];
}> = [
  { id: 'h1', icon: 'format_h1', labelKey: 'h1' },
  { id: 'h2', icon: 'format_h2', labelKey: 'h2' },
  { id: 'h3', icon: 'format_h3', labelKey: 'h3' },
  { id: 'bold', icon: 'format_bold', labelKey: 'bold' },
  { id: 'italic', icon: 'format_italic', labelKey: 'italic' },
  { id: 'inlineCode', icon: 'code', labelKey: 'inlineCode' },
  { id: 'link', icon: 'link', labelKey: 'link' },
  { id: 'ul', icon: 'format_list_bulleted', labelKey: 'ul' },
  { id: 'ol', icon: 'format_list_numbered', labelKey: 'ol' },
  { id: 'quote', icon: 'format_quote', labelKey: 'quote' },
  { id: 'codeBlock', icon: 'data_object', labelKey: 'codeBlock' },
  { id: 'task', icon: 'checklist', labelKey: 'task' },
];

export function MarkdownFormatToolbar({
  locale = 'zh-CN',
  disabled = false,
  onCommand,
  className = '',
}: MarkdownFormatToolbarProps) {
  const t = messages[locale].markdownEditor.toolbar;

  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface-container p-1 ${className}`}
      role="toolbar"
      aria-label={messages[locale].markdownEditor.toolbarLabel}
    >
      {TOOLBAR_ITEMS.map((item) => {
        const label = t[item.labelKey];
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-label={label}
            title={label}
            onClick={() => onCommand(item.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-dim hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              {item.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
