import { describe, expect, it } from 'vitest';
import { applyMarkdownInsert, stripLeadingBlockMarker } from './markdownInsert';

describe('stripLeadingBlockMarker', () => {
  it('removes heading and list markers', () => {
    expect(stripLeadingBlockMarker('## Title')).toBe('Title');
    expect(stripLeadingBlockMarker('- [ ] item')).toBe('item');
    expect(stripLeadingBlockMarker('1. step')).toBe('step');
  });
});

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

  it('converts the current line to a heading instead of adding a new line', () => {
    const result = applyMarkdownInsert('My title\nnext', { from: 3, to: 3 }, 'h1');
    expect(result.value).toBe('# My title\nnext');
  });

  it('replaces an existing heading level on the current line', () => {
    const result = applyMarkdownInsert('## Old\n', { from: 5, to: 5 }, 'h1');
    expect(result.value).toBe('# Old\n');
  });

  it('converts the current line to an ordered list item', () => {
    const result = applyMarkdownInsert('Do thing\n', { from: 2, to: 2 }, 'ol');
    expect(result.value).toBe('1. Do thing\n');
  });

  it('converts the current line to a task list item', () => {
    const result = applyMarkdownInsert('Todo item\n', { from: 4, to: 4 }, 'task');
    expect(result.value).toBe('- [ ] Todo item\n');
  });

  it('inserts a task list marker on an empty line', () => {
    const result = applyMarkdownInsert('', { from: 0, to: 0 }, 'task');
    expect(result.value).toBe('- [ ] ');
  });

  it('wraps non-empty line content in a fenced code block', () => {
    const result = applyMarkdownInsert('const x = 1\n', { from: 6, to: 6 }, 'codeBlock');
    expect(result.value).toBe('```\nconst x = 1\n```\n');
  });
});
