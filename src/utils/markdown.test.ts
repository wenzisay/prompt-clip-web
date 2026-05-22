import { describe, expect, it } from 'vitest';
import { parseMarkdown, serializeMarkdown } from './markdown';

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
