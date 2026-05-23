interface MarkdownTextViewProps {
  content: string;
  className?: string;
}

export function MarkdownTextView({ content, className = '' }: MarkdownTextViewProps) {
  if (!content) {
    return <p className="text-muted">暂无内容</p>;
  }

  return (
    <pre
      className={`
        whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-container
        p-4 font-mono text-sm leading-6 text-fg
        ${className}
      `}
    >
      {content}
    </pre>
  );
}
