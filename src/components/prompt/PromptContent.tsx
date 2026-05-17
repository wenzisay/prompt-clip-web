/**
 * Prompt 内容渲染组件
 */

import { useEffect, useState } from 'react';
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
        setHtml(`<p class="text-error">渲染失败</p>`);
      }
    };

    render();
  }, [content]);

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
    return <p className="text-muted">暂无内容</p>;
  }

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
