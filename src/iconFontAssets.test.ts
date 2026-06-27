import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

describe('icon font assets', () => {
  it('should bundle Material Symbols locally for desktop builds', () => {
    const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf8');
    const indexCss = readFileSync(join(rootDir, 'src/index.css'), 'utf8');

    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexCss).toContain("@font-face");
    expect(indexCss).toContain("font-family: 'Material Symbols Outlined'");
    expect(indexCss).toContain('/fonts/material-symbols-outlined.woff2');
  });

  it('should keep fallback ligature text from expanding icon layout', () => {
    const indexCss = readFileSync(join(rootDir, 'src/index.css'), 'utf8');

    expect(indexCss).toContain('width: 1em');
    expect(indexCss).toContain('overflow: hidden');
  });

  it('should preload the icon font for faster first render', () => {
    const indexHtml = readFileSync(join(rootDir, 'index.html'), 'utf8');

    expect(indexHtml).toContain('rel="preload"');
    expect(indexHtml).toContain('/fonts/material-symbols-outlined.woff2');
  });

  it('should keep the icon font subsetted (regression guard against the full font)', () => {
    // 完整字体 ~1.1MB，子集化后约 11KB。阈值留足图标增长余量，
    // 主要防止误把完整字体放回仓库。
    const fontStats = statSync(
      join(rootDir, 'public', 'fonts', 'material-symbols-outlined.woff2')
    );

    expect(fontStats.size).toBeLessThan(200 * 1024);
  });
});
