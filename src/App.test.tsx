import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppRouter, isAboutPath } from './App';

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
});
