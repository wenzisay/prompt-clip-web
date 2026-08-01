import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  it('should discover icons returned from helpers and nested conditions', () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), 'promptclip-material-symbols-'));
    const fixturePath = join(fixtureDir, 'Fixture.tsx');
    writeFileSync(
      fixturePath,
      `
        <span className="material-symbols-outlined">search</span>
        <Action icon="upload" />
        const nested = first ? 'folder' : second ? 'markdown' : 'draft';
        function statusIcon(enabled: boolean) {
          if (enabled) return 'check_circle';
          return 'warning';
        }
      `
    );

    try {
      const scannerPath = join(rootDir, 'scripts', 'subset_material_symbols.py');
      const python = `
import importlib.util
import json
import sys
import types
from pathlib import Path

sys.dont_write_bytecode = True
font_tools = types.ModuleType('fontTools')
tt_lib = types.ModuleType('fontTools.ttLib')
tt_lib.TTFont = object
font_tools.ttLib = tt_lib
sys.modules['fontTools'] = font_tools
sys.modules['fontTools.ttLib'] = tt_lib

spec = importlib.util.spec_from_file_location('subset_material_symbols', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(json.dumps(module.scan_source_icons(Path(sys.argv[2]))))
`;
      const output = execFileSync('python3', ['-c', python, scannerPath, fixtureDir], {
        encoding: 'utf8',
      });

      expect(JSON.parse(output)).toEqual([
        'check_circle',
        'draft',
        'folder',
        'markdown',
        'search',
        'upload',
        'warning',
      ]);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('should include every skill management icon in the generated subset', () => {
    const glyphs = new Set(
      readFileSync(join(rootDir, 'scripts', 'icon-glyphs.txt'), 'utf8')
        .split('\n')
        .filter(Boolean)
    );
    const skillIcons = [
      'bolt',
      'check_circle',
      'extension',
      'link_off',
      'markdown',
      'progress_activity',
      'remove_circle_outline',
      'star_outline',
      'sync_problem',
      'upload',
      'warning',
    ];

    expect(skillIcons.filter((icon) => !glyphs.has(icon))).toEqual([]);
  });
});
