import { describe, expect, it } from 'vitest';
import { parseFrontmatterOnly, parseMarkdown, serializeMarkdown } from './markdown';

describe('markdown utilities', () => {
  it('parses quoted stable id from frontmatter', () => {
    const result = parseMarkdown(
      [
        '---',
        'id: "17474772001234567"',
        'title: "标题"',
        '---',
        '',
        '正文',
      ].join('\n')
    );

    expect(result.metadata.id).toBe('17474772001234567');
  });

  it('parses unquoted numeric stable id as string', () => {
    const result = parseMarkdown(
      [
        '---',
        'id: 17474772001234567',
        'title: "标题"',
        '---',
        '',
        '正文',
      ].join('\n')
    );

    expect(result.metadata.id).toBe('17474772001234567');
  });

  it('serializes stable id first and quotes it as a string', () => {
    const result = serializeMarkdown('正文', {
      id: '17474772001234567',
      title: '标题',
    });

    expect(result).toBe(
      [
        '---',
        'id: "17474772001234567"',
        'title: "标题"',
        '---',
        '',
        '正文',
      ].join('\n')
    );
  });

  it('parses Obsidian block tags from frontmatter', () => {
    const result = parseMarkdown(
      [
        '---',
        'title: "标题"',
        'tags:',
        '  - 工具盒/AI工具',
        '  - Coding',
        '---',
        '',
        '正文',
      ].join('\n')
    );

    expect(result.metadata.tags).toEqual(['工具盒/AI工具', 'Coding']);
  });

  it('serializes tags using block style when requested', () => {
    const result = serializeMarkdown(
      '正文',
      {
        title: '标题',
        tags: ['工具盒/AI工具', 'Coding'],
      },
      { tagStyle: 'block' }
    );

    expect(result).toBe(
      [
        '---',
        'title: "标题"',
        'tags:',
        '  - "工具盒/AI工具"',
        '  - "Coding"',
        '---',
        '',
        '正文',
      ].join('\n')
    );
  });
});

describe('parseFrontmatterOnly', () => {
  it('parses a complete frontmatter and returns the body slice', () => {
    const text = ['---', 'title: Hello', 'tags: [a, b]', '---', '', 'Body line one'].join('\n');
    const result = parseFrontmatterOnly(text);
    expect(result.incomplete).toBe(false);
    expect(result.metadata.title).toBe('Hello');
    expect(result.metadata.tags).toEqual(['a', 'b']);
    expect(result.body).toBe('\nBody line one');
  });

  it('returns incomplete=true when frontmatter starts but end delimiter is missing', () => {
    const text = ['---', 'title: Hello', 'tags:', '  - a'].join('\n');
    const result = parseFrontmatterOnly(text);
    expect(result.incomplete).toBe(true);
    expect(result.metadata).toEqual({});
    expect(result.body).toBe('');
  });

  it('treats text without frontmatter as pure body', () => {
    const text = 'Just body text\nNo frontmatter here';
    const result = parseFrontmatterOnly(text);
    expect(result.incomplete).toBe(false);
    expect(result.metadata).toEqual({});
    expect(result.body).toBe(text);
  });

  it('handles CRLF line endings', () => {
    const text = '---\r\ntitle: Win\r\n---\r\nBody';
    const result = parseFrontmatterOnly(text);
    expect(result.incomplete).toBe(false);
    expect(result.metadata.title).toBe('Win');
    expect(result.body).toBe('Body');
  });
});
