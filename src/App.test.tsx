import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppRouter, isAboutPath, isPrivacyPath } from './App';

describe('isAboutPath', () => {
  it('matches the about route with an optional trailing slash', () => {
    expect(isAboutPath('/about')).toBe(true);
    expect(isAboutPath('/about/')).toBe(true);
  });

  it('does not match other routes', () => {
    expect(isAboutPath('/')).toBe(false);
    expect(isAboutPath('/about-us')).toBe(false);
    expect(isAboutPath('/prompts/about')).toBe(false);
  });
});

describe('AppRouter', () => {
  it('renders the standalone about page for /about', () => {
    const markup = renderToStaticMarkup(<AppRouter pathname="/about" />);

    expect(markup).toContain('PromptClip · Local-first personal prompt workspace');
    expect(markup).toContain('File over app');
  });

  it('renders the standalone privacy page for /privacy', () => {
    const markup = renderToStaticMarkup(<AppRouter pathname="/privacy" />);

    expect(markup).toContain('隐私政策');
    expect(markup).toContain('本地优先，文件属于你');
  });
});

describe('isPrivacyPath', () => {
  it('matches the privacy route with an optional trailing slash', () => {
    expect(isPrivacyPath('/privacy')).toBe(true);
    expect(isPrivacyPath('/privacy/')).toBe(true);
  });

  it('does not match other routes', () => {
    expect(isPrivacyPath('/')).toBe(false);
    expect(isPrivacyPath('/privacy-policy')).toBe(false);
    expect(isPrivacyPath('/prompts/privacy')).toBe(false);
  });
});
