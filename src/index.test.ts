import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

describe('markdown content styles', () => {
  it('renders unordered and ordered markdown lists with visible markers', () => {
    expect(css).toContain('.prose ul');
    expect(css).toContain('list-style-type: disc;');
    expect(css).toContain('.prose ol');
    expect(css).toContain('list-style-type: decimal;');
  });
});
