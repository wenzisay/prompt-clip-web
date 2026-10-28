import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownModeToggle } from './MarkdownModeToggle';

describe('MarkdownModeToggle', () => {
  it('renders icon-only controls with accessible mode names', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="source" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('aria-label="切换 Markdown 显示模式"');
    expect(markup).toContain('aria-label="源码模式"');
    expect(markup).toContain('aria-label="Live Preview"');
    expect(markup).toContain('text_fields');
    expect(markup).toContain('visibility');
  });

  it('marks source mode as selected', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="source" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('data-mode="source"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('bg-accent text-white shadow-card');
  });

  it('marks live mode as selected', () => {
    const markup = renderToStaticMarkup(
      <MarkdownModeToggle mode="live" onModeChange={vi.fn()} />
    );

    expect(markup).toContain('data-mode="live"');
    expect(markup).toContain('aria-pressed="true"');
  });
});
