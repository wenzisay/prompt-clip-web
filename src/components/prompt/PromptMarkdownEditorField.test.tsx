import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PromptMarkdownEditorField } from './PromptMarkdownEditorField';

describe('PromptMarkdownEditorField', () => {
  it('renders the fullscreen action above the editor', () => {
    const markup = renderToStaticMarkup(
      <PromptMarkdownEditorField
        value="# 标题"
        onChange={vi.fn()}
        mode="preview"
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
        mode="text"
        onModeChange={vi.fn()}
        initialIsFullscreen
      />
    );

    expect(markup).toContain('fixed inset-0');
    expect(markup).toContain('prompt-markdown-editor-field--fullscreen');
    expect(markup).toContain('h-full min-h-0 flex-1 overflow-auto');
    expect(markup).toContain('aria-label="退出全屏"');
    expect(markup).toContain('close_fullscreen');
  });

  it('marks the rendered preview as fullscreen when preview mode is fullscreen', () => {
    const markup = renderToStaticMarkup(
      <PromptMarkdownEditorField
        value="# 标题"
        onChange={vi.fn()}
        mode="preview"
        onModeChange={vi.fn()}
        initialIsFullscreen
      />
    );

    expect(markup).toContain('prompt-markdown-preview-editor--fullscreen');
    expect(markup).toContain('<h1>标题</h1>');
  });
});
