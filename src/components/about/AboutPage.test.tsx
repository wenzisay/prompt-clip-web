import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AboutPageContent } from './AboutPage';

describe('AboutPageContent', () => {
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
});
