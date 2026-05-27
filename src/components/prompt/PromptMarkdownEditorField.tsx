import { useEffect, useState } from 'react';
import { messages, type Locale } from '@/i18n';
import { countChars } from '@/utils/markdown';
import { MarkdownModeToggle, type MarkdownViewMode } from './MarkdownModeToggle';
import { MarkdownPreviewEditor } from './MarkdownPreviewEditor';

interface PromptMarkdownEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  mode: MarkdownViewMode;
  onModeChange: (mode: MarkdownViewMode) => void;
  disabled?: boolean;
  initialIsFullscreen?: boolean;
  locale?: Locale;
}

export function PromptMarkdownEditorField({
  value,
  onChange,
  mode,
  onModeChange,
  disabled = false,
  initialIsFullscreen = false,
  locale = 'zh-CN',
}: PromptMarkdownEditorFieldProps) {
  const t = messages[locale];
  const [isFullscreen, setIsFullscreen] = useState(initialIsFullscreen);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  const fullscreenLabel = isFullscreen ? t.app.exitFullscreen : t.app.fullscreenEdit;
  const fullscreenIcon = isFullscreen ? 'close_fullscreen' : 'open_in_full';
  const editorClassName = isFullscreen
    ? 'h-full min-h-0 flex-1 overflow-auto'
    : 'min-h-[320px] flex-1';
  const previewEditorClassName = isFullscreen
    ? 'prompt-markdown-preview-editor--fullscreen h-full min-h-0 flex-1'
    : editorClassName;

  return (
    <div
      className={
        isFullscreen
          ? 'prompt-markdown-editor-field--fullscreen fixed inset-0 z-[70] flex flex-col bg-surface p-4'
          : 'flex min-h-[360px] flex-1 flex-col'
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="prompt-content" className="block text-sm font-medium text-fg">
          {t.app.content} <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <MarkdownModeToggle locale={locale} mode={mode} onModeChange={onModeChange} />
          <button
            type="button"
            aria-label={fullscreenLabel}
            title={fullscreenLabel}
            onClick={() => setIsFullscreen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-container text-muted transition-colors hover:bg-surface-dim hover:text-fg"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {fullscreenIcon}
            </span>
          </button>
        </div>
      </div>

      {mode === 'text' ? (
        <textarea
          id="prompt-content"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t.app.contentPlaceholder}
          className={`${editorClassName} resize-none rounded-lg border border-[var(--border-strong)] bg-surface-container px-4 py-3 font-mono text-sm leading-6 text-fg shadow-inner transition-colors placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={disabled}
        />
      ) : (
        <MarkdownPreviewEditor
          value={value}
          ariaLabel={t.app.promptContent}
          className={previewEditorClassName}
        />
      )}

      <div className="mt-1 flex justify-end">
        <span className="text-xs text-muted">{t.app.characterCount(countChars(value))}</span>
      </div>
    </div>
  );
}
