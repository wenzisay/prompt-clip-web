import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();

describe('bundle optimization', () => {
  it('does not emit production sourcemaps for static asset requests', () => {
    const viteConfig = readFileSync(join(rootDir, 'vite.config.ts'), 'utf8');

    expect(viteConfig).toContain('sourcemap: false');
  });

  it('loads low-frequency modal bundles on demand', () => {
    const app = readFileSync(join(rootDir, 'src/App.tsx'), 'utf8');

    expect(app).toContain('lazy(');
    expect(app).toContain("import('@/components/export/ExportModal')");
    expect(app).toContain("import('@/components/share')");
  });
});
