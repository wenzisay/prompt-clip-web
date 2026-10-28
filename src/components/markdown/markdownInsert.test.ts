import { describe, expect, it } from 'vitest';
import { applyMarkdownInsert } from './markdownInsert';

describe('applyMarkdownInsert', () => {
  it('wraps selection in bold markers', () => {
    const result = applyMarkdownInsert('hello world', { from: 6, to: 11 }, 'bold');
    expect(result.value).toBe('hello **world**');
    expect(result.selection).toEqual({ from: 8, to: 13 });
  });

  it('inserts heading prefix on an empty line', () => {
    const result = applyMarkdownInsert('line one\n\n', { from: 10, to: 10 }, 'h2');
    expect(result.value).toBe('line one\n\n## ');
    expect(result.selection.from).toBe(result.selection.to);
  });

  it('inserts a task list item', () => {
    const result = applyMarkdownInsert('', { from: 0, to: 0 }, 'task');
    expect(result.value).toBe('- [ ] ');
  });

  it('inserts fenced code block snippet', () => {
    const result = applyMarkdownInsert('text', { from: 4, to: 4 }, 'codeBlock');
    expect(result.value).toContain('```');
    expect(result.value).toContain('```');
  });
});
