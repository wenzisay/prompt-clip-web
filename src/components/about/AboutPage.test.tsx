import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { AboutPageContent } from './AboutPage';

describe('AboutPageContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the standalone about copy from the imported HTML page', () => {
    const markup = renderToStaticMarkup(<AboutPageContent locale="zh-CN" />);

    expect(markup).toContain('About');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('返回主页');
    expect(markup).toContain('PromptClip');
    expect(markup).toContain('为 AI 时代而构建的个人 Prompt 工作空间');
    expect(markup).toContain('快速记录，便捷检索，持续复用，长期演化');
    expect(markup).toContain('File over app / 文件，高于应用');
    expect(markup).toContain('Local First / 本地优先');
    expect(markup).toContain('工具可能会消失，数据永远属于你');
    expect(markup).toContain('PromptClip · Local-first personal prompt workspace');
  });

  it('owns its scroll container because the app body is viewport-locked', () => {
    const markup = renderToStaticMarkup(<AboutPageContent locale="zh-CN" />);

    expect(markup).toContain('h-screen');
    expect(markup).toContain('overflow-y-auto');
  });

  it('links to the privacy page at the bottom of the article', () => {
    const markup = renderToStaticMarkup(<AboutPageContent locale="zh-CN" />);

    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('隐私政策');
  });

  it('switches the visible about copy to English', () => {
    render(<AboutPageContent locale="zh-CN" />);

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'PromptClip',
      })
    ).toBeTruthy();
    expect(
      screen.getByText('A personal Prompt workspace built for the AI era')
    ).toBeTruthy();
    expect(screen.getByText('Back home')).toBeTruthy();
    expect(screen.getByText('Privacy policy')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });
});
