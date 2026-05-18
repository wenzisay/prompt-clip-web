import { readFileSync } from 'node:fs';
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
});
