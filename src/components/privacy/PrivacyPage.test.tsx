import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { PrivacyPageContent } from './PrivacyPage';

describe('PrivacyPageContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Chinese privacy policy imported from docs/preview.html', () => {
    const markup = renderToStaticMarkup(<PrivacyPageContent initialLanguage="zh" />);

    expect(markup).toContain('href="/"');
    expect(markup).toContain('返回首页');
    expect(markup).toContain('隐私政策');
    expect(markup).toContain('最后更新：2026 年 7 月 14 日');
    expect(markup).toContain('你的 Prompt、笔记、批注、标签和工作流内容属于你');
    expect(markup).toContain('promptclip@outlook.com');
    expect(markup).toContain('h-screen');
    expect(markup).toContain('overflow-y-auto');
  });

  it('switches the visible policy copy to English', () => {
    render(<PrivacyPageContent initialLanguage="zh" />);

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeTruthy();
    expect(screen.getByText('Last updated: July 14, 2026')).toBeTruthy();
    expect(screen.getByText('Local-first. Your files belong to you.')).toBeTruthy();
    expect(screen.getByText(/Your prompts, notes, annotations, tags, and workflows belong to you/)).toBeTruthy();
  });
});
