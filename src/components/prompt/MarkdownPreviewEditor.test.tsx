import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownPreviewEditor } from './MarkdownPreviewEditor';

describe('MarkdownPreviewEditor', () => {
  it('renders markdown as html with an accessible label', () => {
    const markup = renderToStaticMarkup(
      <MarkdownPreviewEditor value="# 标题" ariaLabel="Prompt 内容" />
    );

    expect(markup).toContain('aria-label="Prompt 内容"');
    expect(markup).toContain('data-testid="markdown-preview-editor"');
    expect(markup).toContain('<h1>标题</h1>');
  });

  it('shows an empty state when content is blank', () => {
    const markup = renderToStaticMarkup(
      <MarkdownPreviewEditor value="" ariaLabel="Prompt 内容" />
    );

    expect(markup).toContain('No content');
  });
});
