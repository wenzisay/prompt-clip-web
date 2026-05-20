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
});
