import { describe, expect, it } from 'vitest';
import {
  assertSafeRelativePath,
  joinPath,
  normalizeRelativePath,
  sanitizeFilename,
  toPortablePath,
} from './path';

describe('path utilities', () => {
  it('normalizes separators and removes duplicate slashes', () => {
    expect(toPortablePath('folder\\child\\file.md')).toBe('folder/child/file.md');
    expect(normalizeRelativePath('folder//child///file.md')).toBe('folder/child/file.md');
  });

  it('joins path parts using portable separators', () => {
    expect(joinPath('folder', 'child', 'file.md')).toBe('folder/child/file.md');
    expect(joinPath('folder/', '/child/', 'file.md')).toBe('folder/child/file.md');
  });

  it('rejects unsafe relative paths', () => {
    expect(() => assertSafeRelativePath('')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('/absolute.md')).toThrow('文件路径不合法');
    expect(() => normalizeRelativePath('/absolute.md')).toThrow('文件路径不合法');
    expect(() => normalizeRelativePath('\\\\server\\share.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('../outside.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('folder/../outside.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('C:/absolute.md')).toThrow('文件路径不合法');
    expect(() => assertSafeRelativePath('C:relative.md')).toThrow('文件路径不合法');
  });

  it('keeps safe relative paths', () => {
    expect(() => assertSafeRelativePath('folder/file.md')).not.toThrow();
    expect(normalizeRelativePath('folder/file.md')).toBe('folder/file.md');
  });

  it('sanitizes cross-platform filenames', () => {
    expect(sanitizeFilename('CON')).toBe('CON-');
    expect(sanitizeFilename('CON.md')).toBe('CON-.md');
    expect(sanitizeFilename('NUL.txt')).toBe('NUL-.txt');
    expect(sanitizeFilename('COM1.prompt.md')).toBe('COM1-.prompt.md');
    expect(sanitizeFilename('hello/world:prompt')).toBe('hello-world-prompt');
    expect(sanitizeFilename('hello\u0000world\u001Fprompt')).toBe('hello-world-prompt');
    expect(sanitizeFilename('  prompt  ')).toBe('prompt');
  });
});
