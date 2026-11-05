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

  it('wraps every selected paragraph in one fenced code block', () => {
    const selected = 'first line\nsecond line\n\nthird paragraph';
    const value = `Before\n\n${selected}\n\nAfter`;
    const from = value.indexOf(selected);
    const result = applyMarkdownInsert(value, { from, to: from + selected.length }, 'codeBlock');

    expect(result.value).toBe(`Before\n\n\`\`\`\n${selected}\n\`\`\`\n\nAfter`);
    expect(result.value.slice(result.selection.from, result.selection.to)).toBe(selected);
  });

  it('puts fences on separate lines around a partial-line selection', () => {
    const result = applyMarkdownInsert('before first\nsecond after', { from: 7, to: 19 }, 'codeBlock');

    expect(result.value).toBe('before \n```\nfirst\nsecond\n```\n after');
  });

  it('preserves a selection ending at the beginning of the next line', () => {
    const result = applyMarkdownInsert('one\ntwo\nafter', { from: 0, to: 8 }, 'codeBlock');

    expect(result.value).toBe('```\none\ntwo\n```\nafter');
  });

  it('preserves Markdown markers as literal code', () => {
    const result = applyMarkdownInsert('# heading\n- item', { from: 0, to: 16 }, 'codeBlock');

    expect(result.value).toBe('```\n# heading\n- item\n```');
  });

  it('uses a longer fence when the selection contains fenced code', () => {
    const value = '```js\nconst x = 1;\n```';
    const result = applyMarkdownInsert(value, { from: 0, to: value.length }, 'codeBlock');

    expect(result.value).toBe(`\`\`\`\`\n${value}\n\`\`\`\``);
  });

  it('places the caret inside an empty code block', () => {
    const result = applyMarkdownInsert('', { from: 0, to: 0 }, 'codeBlock');

    expect(result).toEqual({ value: '```\n\n```', selection: { from: 4, to: 4 } });
  });
});
