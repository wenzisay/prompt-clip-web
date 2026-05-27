/**
 * Prompt 内容渲染组件
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { renderMarkdown } from '@/utils/markdown';

interface PromptContentProps {
  /** Markdown 内容 */
  content: string;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

export function PromptContent({ content, isLoading = false, className = '' }: PromptContentProps) {
  const { t } = useTranslation();
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (!content) {
      setHtml('');
      return;
    }

    const render = async () => {
      try {
        const rendered = await renderMarkdown(content);
        setHtml(rendered);
      } catch (error) {
        console.error('Markdown 渲染失败:', error);
        setHtml(`<p class="text-error">${t.app.renderFailed}</p>`);
      }
    };

    render();
  }, [content, t.app.renderFailed]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-surface-dim rounded mb-2"></div>
        <div className="h-4 bg-surface-dim rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-surface-dim rounded w-1/2"></div>
      </div>
    );
  }

  if (!html) {
    return <p className="text-muted">{t.app.noContent}</p>;
  }

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
