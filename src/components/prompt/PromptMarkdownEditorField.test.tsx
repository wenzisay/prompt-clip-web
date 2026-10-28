import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PromptMarkdownEditorField } from './PromptMarkdownEditorField';

vi.mock('@/components/markdown/MarkdownLiveEditor', () => ({
  MarkdownLiveEditor: ({
    ariaLabel,
    className,
  }: {
    ariaLabel: string;
    className?: string;
  }) => (
    <div data-testid="markdown-live-editor" aria-label={ariaLabel} className={className} />
  ),
}));

describe('PromptMarkdownEditorField', () => {
  it('renders the fullscreen action above the editor', () => {
    const markup = renderToStaticMarkup(
      <PromptMarkdownEditorField
        value="# 标题"
        onChange={vi.fn()}
        mode="live"
        onModeChange={vi.fn()}
      />
    );

    expect(markup).toContain('aria-label="全屏编辑"');
    expect(markup).toContain('open_in_full');
    expect(markup).toContain('aria-label="切换 Markdown 显示模式"');
  });

  it('can render in fullscreen layout', () => {
    const markup = renderToStaticMarkup(
      <PromptMarkdownEditorField
        value="# 标题"
        onChange={vi.fn()}
        mode="source"
        onModeChange={vi.fn()}
        initialIsFullscreen
      />
    );

    expect(markup).toContain('fixed inset-0');
    expect(markup).toContain('prompt-markdown-editor-field--fullscreen');
    expect(markup).toContain('h-full min-h-0 flex-1');
    expect(markup).toContain('aria-label="退出全屏"');
    expect(markup).toContain('close_fullscreen');
  });

  it('renders the live markdown editor region with prompt content label', () => {
    const markup = renderToStaticMarkup(
      <PromptMarkdownEditorField
        value="# 标题"
        onChange={vi.fn()}
        mode="live"
        onModeChange={vi.fn()}
      />
    );

    expect(markup).toContain('data-testid="markdown-live-editor"');
    expect(markup).toContain('aria-label="Prompt 内容"');
  });
});
