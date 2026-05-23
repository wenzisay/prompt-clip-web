export type MarkdownViewMode = 'text' | 'preview';

interface MarkdownModeToggleProps {
  mode: MarkdownViewMode;
  onModeChange: (mode: MarkdownViewMode) => void;
  className?: string;
}

const OPTIONS: Array<{ mode: MarkdownViewMode; label: string; icon: string }> = [
  { mode: 'text', label: '源码模式', icon: 'text_fields' },
  { mode: 'preview', label: '渲染模式', icon: 'menu_book' },
];

export function MarkdownModeToggle({
  mode,
  onModeChange,
  className = '',
}: MarkdownModeToggleProps) {
  return (
    <div
      className={`inline-flex rounded-lg border border-border bg-surface-container p-0.5 ${className}`}
      role="group"
      aria-label="切换 Markdown 显示模式"
    >
      {OPTIONS.map((option) => {
        const isSelected = mode === option.mode;

        return (
          <button
            key={option.mode}
            type="button"
            data-mode={option.mode}
            aria-label={option.label}
            aria-pressed={isSelected}
            title={option.label}
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
