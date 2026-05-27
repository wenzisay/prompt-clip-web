import { messages, type Locale } from '@/i18n';

export type MarkdownViewMode = 'text' | 'preview';

interface MarkdownModeToggleProps {
  locale?: Locale;
  mode: MarkdownViewMode;
  onModeChange: (mode: MarkdownViewMode) => void;
  className?: string;
}

const OPTIONS: Array<{
  mode: MarkdownViewMode;
  labelKey: 'sourceMode' | 'previewMode';
  icon: string;
}> = [
  { mode: 'text', labelKey: 'sourceMode', icon: 'text_fields' },
  { mode: 'preview', labelKey: 'previewMode', icon: 'menu_book' },
];

export function MarkdownModeToggle({
  locale = 'zh-CN',
  mode,
  onModeChange,
  className = '',
}: MarkdownModeToggleProps) {
  const t = messages[locale];

  return (
    <div
      className={`inline-flex rounded-lg border border-border bg-surface-container p-0.5 ${className}`}
      role="group"
      aria-label={t.app.toggleMarkdownMode}
    >
      {OPTIONS.map((option) => {
        const isSelected = mode === option.mode;
        const label = t.app[option.labelKey];

        return (
          <button
            key={option.mode}
            type="button"
            data-mode={option.mode}
            aria-label={label}
            aria-pressed={isSelected}
            title={label}
            onClick={() => onModeChange(option.mode)}
            className={`
              inline-flex h-8 w-8 items-center justify-center rounded-md
              transition-colors
              ${isSelected
                ? 'bg-accent text-white shadow-card'
                : 'text-muted hover:bg-surface-dim hover:text-fg'}
            `}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              {option.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
