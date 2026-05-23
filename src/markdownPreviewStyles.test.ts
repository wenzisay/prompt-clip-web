import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

describe('markdown preview styles', () => {
  it('wraps code blocks instead of showing horizontal scrollbars', () => {
    const indexCss = readFileSync(join(rootDir, 'src/index.css'), 'utf8');

    expect(indexCss).toContain('.prose pre');
    expect(indexCss).toContain('overflow-x: hidden');
    expect(indexCss).toContain('white-space: pre-wrap');
    expect(indexCss).toContain('overflow-wrap: anywhere');
    expect(indexCss).toContain('white-space: inherit');
  });
});
