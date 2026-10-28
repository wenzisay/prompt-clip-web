import { useMemo } from 'react';
import type { Locale } from '@/i18n';
import { messages } from '@/i18n';
import type { MarkdownInsertCommandId } from './markdownInsert';
import { MARKDOWN_SLASH_COMMANDS } from './markdownSlashCommands';

export interface SlashMenuState {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
}

export interface MarkdownSlashMenuProps {
  locale?: Locale;
  state: SlashMenuState | null;
  onSelect: (command: MarkdownInsertCommandId) => void;
  onClose: () => void;
}

export function MarkdownSlashMenu({
  locale = 'zh-CN',
  state,
  onSelect,
  onClose,
}: MarkdownSlashMenuProps) {
  const t = messages[locale].markdownEditor.slash;

  const items = useMemo(() => {
    if (!state) {
      return [];
    }
    const query = state.query.toLowerCase();
    return MARKDOWN_SLASH_COMMANDS.filter((command) => {
      const label = t[command.labelKey].toLowerCase();
      return !query || label.includes(query) || command.id.includes(query);
    });
  }, [state, t]);

  if (!state) {
    return null;
  }

  return (
    <div
      className="absolute z-[90] min-w-[200px] max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-container py-1 shadow-lg"
      style={{ top: state.top, left: state.left }}
      role="listbox"
      aria-label={messages[locale].markdownEditor.slashMenuLabel}
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted">{t.noMatch}</div>
      ) : (
        items.map((command) => (
          <button
            key={command.id}
            type="button"
            role="option"
            className="flex w-full px-3 py-2 text-left text-sm text-fg hover:bg-surface-dim"
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(command.id);
            }}
          >
            {t[command.labelKey]}
          </button>
        ))
      )}
      <button
        type="button"
        className="sr-only"
        onClick={onClose}
        aria-label={messages[locale].markdownEditor.slashMenuClose}
      />
    </div>
  );
}
