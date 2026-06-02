/**
 * Markdown 解析和渲染工具
 *
 * 使用 marked 渲染 markdown
 */

import { marked } from 'marked';
import type { PromptMetadata } from '@/types/prompt';

export type FrontmatterTagStyle = 'inline' | 'block';

export interface SerializeMarkdownOptions {
  tagStyle?: FrontmatterTagStyle;
}

/**
 * 解析 Markdown 文件
 * 提取 frontmatter 和内容
 */
export function parseMarkdown(content: string): {
  metadata: PromptMetadata;
  content: string;
  raw: string;
} {
  const { data, content: markdownContent } = parseFrontmatter(content);

  return {
    metadata: {
      id: normalizeString(data.id),
      title: data.title as string | undefined,
      tags: normalizeTags(data.tags),
      created: data.created as string | undefined,
      modified: data.modified as string | undefined,
      copyCount: normalizeNumber(data.copy_count ?? data.copyCount),
      pinned: data.pinned as boolean | undefined,
      pinnedAt: data.pinned_at as string | undefined,
    },
    content: markdownContent,
    raw: content,
  };
}

/**
 * 序列化为 Markdown 文件
 * 将 metadata 和内容组合成带 frontmatter 的 markdown
 */
export function serializeMarkdown(
  content: string,
  metadata: PromptMetadata = {},
  options: SerializeMarkdownOptions = {}
): string {
  const frontmatter: Record<string, unknown> = {};

  if (metadata.id) frontmatter.id = metadata.id;
  if (metadata.title) frontmatter.title = metadata.title;
  if (metadata.tags && metadata.tags.length > 0) frontmatter.tags = metadata.tags;
  if (metadata.created) frontmatter.created = metadata.created;
  if (metadata.modified) frontmatter.modified = metadata.modified;
  if (metadata.copyCount !== undefined) frontmatter.copy_count = metadata.copyCount;
  if (metadata.pinned !== undefined) frontmatter.pinned = metadata.pinned;
  if (metadata.pinnedAt) frontmatter.pinned_at = metadata.pinnedAt;

  // 如果没有 frontmatter 数据，直接返回内容
  if (Object.keys(frontmatter).length === 0) {
    return content;
  }

  return `---\n${stringifyFrontmatter(frontmatter, options)}---\n\n${content}`;
}

function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const normalized = content.replace(/^\uFEFF/, '');

  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { data: {}, content };
  }

  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, content };
  }

  return {
    data: parseSimpleYaml(match[1]),
    content: normalized.slice(match[0].length),
  };
}

const PREVIEW_LINE_LIMIT = 4;
const PREVIEW_CHARACTER_LIMIT = 120;

/**
 * \u4ECE\u6B63\u6587\u4E2D\u622A\u53D6\u5361\u7247\u9884\u89C8\uFF1A\u6700\u591A 4 \u884C\u3001120 \u5B57\u7B26\u3002
 */
export function getPromptPreview(content: string): { text: string; isTruncated: boolean } {
  let text = '';
  let lineCount = 1;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const isLineBreak = char === '\n' || char === '\r';

    if (isLineBreak) {
      if (char === '\r' && content[index + 1] === '\n') {
        index += 1;
      }

      if (lineCount >= PREVIEW_LINE_LIMIT) {
        return { text, isTruncated: index < content.length - 1 };
      }

      lineCount += 1;
      if (text.length < PREVIEW_CHARACTER_LIMIT) {
        text += ' ';
      }
      continue;
    }

    if (text.length >= PREVIEW_CHARACTER_LIMIT) {
      return { text, isTruncated: true };
    }

    text += char;
  }

  return { text, isTruncated: false };
}

/**
 * \u4EC5\u89E3\u6790 frontmatter \u533A\u6BB5\uFF0C\u5E76\u8FD4\u56DE\u6240\u89C1\u5230\u7684\u6B63\u6587\u7247\u6BB5\u3002
 * \u9002\u5408\u53EA\u8BFB\u53D6\u4E86\u6587\u4EF6\u5934\u90E8\u5B57\u8282\u7684\u573A\u666F\uFF1A\u5F53\u8D77\u59CB\u4E3A `---` \u4F46\u672A\u5728\u5934\u90E8\u627E\u5230\u7ED3\u5C3E `---` \u65F6\u8FD4\u56DE incomplete=true\uFF0C
 * \u8C03\u7528\u65B9\u5E94\u56DE\u9000\u5230\u5168\u6587\u8BFB\u53D6\u3002
 */
export function parseFrontmatterOnly(headText: string): {
  metadata: PromptMetadata;
  body: string;
  incomplete: boolean;
} {
  const normalized = headText.replace(/^\uFEFF/, '');
  const hasFrontmatterStart =
    normalized.startsWith('---\n') || normalized.startsWith('---\r\n');

  if (!hasFrontmatterStart) {
    return { metadata: {}, body: headText, incomplete: false };
  }

  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { metadata: {}, body: '', incomplete: true };
  }

  const data = parseSimpleYaml(match[1]);
  return {
    metadata: {
      id: normalizeString(data.id),
      title: data.title as string | undefined,
      tags: normalizeTags(data.tags),
      created: data.created as string | undefined,
      modified: data.modified as string | undefined,
      copyCount: normalizeNumber(data.copy_count ?? data.copyCount),
      pinned: data.pinned as boolean | undefined,
      pinnedAt: data.pinned_at as string | undefined,
    },
    body: normalized.slice(match[0].length),
    incomplete: false,
  };
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!value) {
      const blockItems = parseYamlBlockArray(lines, index + 1);
      if (blockItems.items.length > 0) {
        data[key] = blockItems.items;
        index = blockItems.lastIndex;
        continue;
      }
    }

    data[key] = key === 'id' ? unquoteYamlString(value) : parseYamlValue(value);
  }

  return data;
}

function parseYamlBlockArray(
  lines: string[],
  startIndex: number
): { items: string[]; lastIndex: number } {
  const items: string[] = [];
  let lastIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s+-\s+/.test(line)) {
      break;
    }

    items.push(unquoteYamlString(line.replace(/^\s+-\s+/, '').trim()));
    lastIndex = index;
  }

  return { items, lastIndex };
}

function parseYamlValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineArray(inner).map((item) => unquoteYamlString(item.trim()));
  }

  return unquoteYamlString(value);
}

function splitInlineArray(value: string): string[] {
  const items: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const char of value) {
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    }

    if (char === ',' && quote === null) {
      items.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) items.push(current);
  return items;
}

function unquoteYamlString(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function stringifyFrontmatter(
  frontmatter: Record<string, unknown>,
  options: SerializeMarkdownOptions
): string {
  return Object.entries(frontmatter)
    .map(([key, value]) => stringifyYamlEntry(key, value, options))
    .join('\n')
    .concat('\n');
}

function stringifyYamlEntry(
  key: string,
  value: unknown,
  options: SerializeMarkdownOptions
): string {
  if (key === 'tags' && options.tagStyle === 'block' && Array.isArray(value)) {
    return stringifyYamlBlockArray(key, value);
  }

  return `${key}: ${stringifyYamlValue(value)}`;
}

function stringifyYamlBlockArray(key: string, value: unknown[]): string {
  if (value.length === 0) {
    return `${key}: []`;
  }

  return [
    `${key}:`,
    ...value.map((item) => `  - ${quoteYamlString(String(item))}`),
  ].join('\n');
}

function stringifyYamlValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => quoteYamlString(String(item))).join(', ')}]`;
  }

  if (typeof value === 'string') {
    return quoteYamlString(value);
  }

  return String(value);
}

function quoteYamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function normalizeTags(tags: unknown): string[] | undefined {
  if (Array.isArray(tags)) {
    return tags.map(String).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);
  }

  return undefined;
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}

/**
 * 检测 frontmatter 中 tags 的写法。
 */
export function detectFrontmatterTagStyle(content: string): FrontmatterTagStyle | null {
  const match = content
    .replace(/^\uFEFF/, '')
    .match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return null;
  }

  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^\s*tags:/.test(line)) {
      continue;
    }

    const value = line.slice(line.indexOf(':') + 1).trim();
    if (value) {
      return 'inline';
    }

    const nextLine = lines[index + 1];
    return nextLine && /^\s+-\s+/.test(nextLine) ? 'block' : 'inline';
  }

  return null;
}

/**
 * 渲染 Markdown 为 HTML
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  return await marked(markdown);
}

/**
 * 同步渲染 Markdown 为 HTML（用于简单场景）
 */
export function renderMarkdownSync(markdown: string): string {
  return marked.parse(markdown) as string;
}

/**
 * 从内容提取标题（第一行 # 标题）
 */
export function extractTitle(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '');
    }
  }
  return null;
}

/**
 * 生成默认 frontmatter
 */
export function generateDefaultMetadata(): PromptMetadata {
  const now = new Date().toISOString();
  return {
    title: '',
    tags: [],
    created: now,
    modified: now,
    copyCount: 0,
    pinned: false,
  };
}

/**
 * 统计字符数
 */
export function countChars(content: string): number {
  return content.length;
}

/**
 * 统计字数（中文按字符，英文按单词）
 */
export function countWords(content: string): number {
  // 移除 markdown 语法
  const plainText = content
    .replace(/```[\s\S]*?```/g, '') // 代码块
    .replace(/`[^`]+`/g, '') // 行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
    .replace(/[#*_~`|>-]/g, '') // markdown 符号
    .trim();

  // 统计中文和英文单词
  const chineseChars = plainText.match(/[\u4e00-\u9fa5]/g);
  const englishWords = plainText.match(/[a-zA-Z]+/g);

  return (chineseChars?.length || 0) + (englishWords?.length || 0);
}

/**
 * 提取内容预览（前 N 个字符）
 */
export function extractPreview(content: string, maxLength = 200): string {
  const plainText = content
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/`[^`]+`/g, '[代码]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~`|>-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.slice(0, maxLength) + '...';
}
