import { renderMarkdownSync } from '@/utils/markdown';

interface MarkdownPreviewEditorProps {
  value: string;
  ariaLabel: string;
  className?: string;
}

export function MarkdownPreviewEditor({
  value,
  ariaLabel,
  className = '',
}: MarkdownPreviewEditorProps) {
  const html = value ? renderMarkdownSync(value) : '';
  const previewClassName = `prompt-markdown-preview-editor${
    html ? ' prompt-detail-content' : ''
  } ${className}`;

  if (html) {
    return (
      <div
        data-testid="markdown-preview-editor"
        aria-label={ariaLabel}
        className={previewClassName}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div
      data-testid="markdown-preview-editor"
      aria-label={ariaLabel}
      className={previewClassName}
    >
      <p className="text-muted">暂无内容</p>
    </div>
  );
}
