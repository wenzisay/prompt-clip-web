import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { parseSupportLanguage, SupportPageContent } from './SupportPage';

describe('parseSupportLanguage', () => {
  it('returns "en" for ?lang=en', () => {
    expect(parseSupportLanguage('?lang=en')).toBe('en');
  });

  it('returns "en" for ?lang=en-US (case-insensitive)', () => {
    expect(parseSupportLanguage('?lang=en-US')).toBe('en');
  });

  it('returns "zh" for ?lang=zh', () => {
    expect(parseSupportLanguage('?lang=zh')).toBe('zh');
  });

  it('defaults to "zh" when lang is absent', () => {
    expect(parseSupportLanguage('')).toBe('zh');
  });

  it('defaults to "zh" for unsupported lang values', () => {
    expect(parseSupportLanguage('?lang=fr')).toBe('zh');
  });
});

describe('SupportPageContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the Chinese support page by default', () => {
    const markup = renderToStaticMarkup(<SupportPageContent initialLanguage="zh" />);

    expect(markup).toContain('href="/"');
    expect(markup).toContain('返回首页');
    expect(markup).toContain('技术支持');
    expect(markup).toContain('你可以就以下问题联系我们');
    expect(markup).toContain('mailto:promptclip@outlook.com');
    expect(markup).toContain('https://www.promptclip.online/privacy');
    expect(markup).toContain('https://www.promptclip.online');
    expect(markup).toContain('h-screen');
    expect(markup).toContain('overflow-y-auto');
  });

  it('switches the visible copy to English', () => {
    render(<SupportPageContent initialLanguage="zh" />);

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'PromptClip Support' })
    ).toBeTruthy();
    expect(screen.getByText('promptclip@outlook.com')).toBeTruthy();
    expect(screen.getByText('Useful links')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Official Website')).toBeTruthy();
  });

  it('switches back to Chinese from English', () => {
    render(<SupportPageContent initialLanguage="en" />);

    fireEvent.click(screen.getByRole('button', { name: '中文' }));

    expect(screen.getByRole('heading', { level: 1, name: '技术支持' })).toBeTruthy();
    expect(screen.getByText('你可以就以下问题联系我们')).toBeTruthy();
  });
});
