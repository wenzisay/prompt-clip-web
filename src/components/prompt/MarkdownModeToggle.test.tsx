import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownModeToggle } from './MarkdownModeToggle';

describe('MarkdownModeToggle', () => {
  it('renders icon-only controls with accessible mode names', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="text" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('aria-label="切换 Markdown 显示模式"');
    expect(markup).toContain('aria-label="源码模式"');
    expect(markup).toContain('aria-label="渲染模式"');
    expect(markup).toContain('text_fields');
    expect(markup).toContain('menu_book');
    expect(markup).not.toContain('>文本<');
    expect(markup).not.toContain('>预览<');
  });

  it('marks text mode as selected', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="text" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('bg-accent text-white shadow-card');
  });

  it('marks preview mode as selected', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="preview" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('data-mode="preview"');
    expect(markup).toContain('aria-pressed="true"');
  });
});
