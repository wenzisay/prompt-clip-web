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
    const promptManager = readFileSync(
      join(rootDir, 'src/components/prompt/PromptManagerPage.tsx'),
      'utf8'
    );

    expect(promptManager).toContain('lazy(');
    expect(promptManager).toContain("import('@/components/export/ExportModal')");
    expect(promptManager).toContain("import('@/components/share')");
  });

  it('lazy-loads the markdown live editor from prompt and skill entry points', () => {
    const promptField = readFileSync(
      join(rootDir, 'src/components/prompt/PromptMarkdownEditorField.tsx'),
      'utf8'
    );
    const skillEditor = readFileSync(
      join(rootDir, 'src/components/skill/SkillFileEditor.tsx'),
      'utf8'
    );

    expect(promptField).toContain('lazy(');
    expect(promptField).toContain("import('@/components/markdown/MarkdownLiveEditor')");
    expect(skillEditor).toContain('lazy(');
    expect(skillEditor).toContain("import('@/components/markdown/MarkdownLiveEditor')");
  });
});
