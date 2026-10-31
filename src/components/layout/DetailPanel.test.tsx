import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnotationSummaryIndicator, HistoryAction, PromptContentView } from './DetailPanel';

afterEach(() => {
  cleanup();
});

describe('DetailPanel history action', () => {
  it('hides the history button when history versions are disabled', () => {
    const markup = renderToStaticMarkup(
      <HistoryAction isHistoryEnabled={false} onOpen={vi.fn()} />
    );

    expect(markup).not.toContain('aria-label="查看历史版本"');
  });

  it('shows the history button when history versions are enabled', () => {
    const markup = renderToStaticMarkup(
      <HistoryAction isHistoryEnabled onOpen={vi.fn()} />
    );

    expect(markup).toContain('aria-label="查看历史版本"');
  });
});

describe('AnnotationSummaryIndicator', () => {
  it('shows no annotations when count is zero', () => {
    const markup = renderToStaticMarkup(
      <AnnotationSummaryIndicator count={0} onClick={vi.fn()} />
    );

    expect(markup).toContain('<button');
    expect(markup).toContain('无批注');
  });

  it('shows the annotation count', () => {
    const markup = renderToStaticMarkup(
      <AnnotationSummaryIndicator count={3} onClick={vi.fn()} />
    );

    expect(markup).toContain('aria-label="3 条批注"');
    expect(markup).toContain('3 条批注');
  });
});

describe('PromptContentView', () => {
  it('renders a mode toggle above prompt content', () => {
    const markup = renderToStaticMarkup(
      <PromptContentView
        content="# 标题"
        mode="preview"
        onModeChange={vi.fn()}
      />
    );

    expect(markup).toContain('aria-label="切换 Markdown 显示模式"');
    expect(markup).toContain('aria-label="源码模式"');
    expect(markup).toContain('aria-label="渲染模式"');
    expect(markup).not.toContain('>文本<');
    expect(markup).not.toContain('>预览<');
  });

  it('renders raw markdown in text mode', () => {
    const markup = renderToStaticMarkup(
      <PromptContentView
        content="# 标题\n\n正文"
        mode="text"
        onModeChange={vi.fn()}
      />
    );

    expect(markup).toContain('# 标题');
    expect(markup).toContain('正文');
  });

  it('shows a double-click-to-edit hint only when the callback is provided', () => {
    const withHint = renderToStaticMarkup(
      <PromptContentView
        content="# 标题"
        mode="preview"
        onModeChange={vi.fn()}
        onContentDoubleClick={vi.fn()}
      />
    );
    const withoutHint = renderToStaticMarkup(
      <PromptContentView content="# 标题" mode="preview" onModeChange={vi.fn()} />
    );

    expect(withHint).toContain('title="双击进入编辑"');
    expect(withoutHint).not.toContain('双击进入编辑');
  });

  it('triggers the edit callback when double-clicking the content body', () => {
    const onContentDoubleClick = vi.fn();
    const { getByTestId } = render(
      <PromptContentView
        content="# 标题"
        mode="preview"
        onModeChange={vi.fn()}
        onContentDoubleClick={onContentDoubleClick}
      />
    );

    fireEvent.dblClick(getByTestId('prompt-content-view-body'));

    expect(onContentDoubleClick).toHaveBeenCalledTimes(1);
  });

  it('triggers the edit callback in text mode as well', () => {
    const onContentDoubleClick = vi.fn();
    const { getByTestId } = render(
      <PromptContentView
        content="# 标题"
        mode="text"
        onModeChange={vi.fn()}
        onContentDoubleClick={onContentDoubleClick}
      />
    );

    fireEvent.dblClick(getByTestId('prompt-content-view-body'));

    expect(onContentDoubleClick).toHaveBeenCalledTimes(1);
  });
});
