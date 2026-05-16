/**
 * Markdown 解析和渲染工具
 *
 * 使用 gray-matter 解析 frontmatter
 * 使用 marked 渲染 markdown
 */

import matter from 'gray-matter';
import { marked } from 'marked';
import type { PromptMetadata } from '@/types/prompt';

/**
 * 解析 Markdown 文件
 * 提取 frontmatter 和内容
 */
export function parseMarkdown(content: string): {
  metadata: PromptMetadata;
  content: string;
  raw: string;
} {
  const { data, content: markdownContent, orig } = matter(content);

  return {
    metadata: {
      title: data.title as string | undefined,
      tags: data.tags as string[] | undefined,
      created: data.created as string | undefined,
      modified: data.modified as string | undefined,
      copyCount: data.copyCount as number | undefined,
      pinned: data.pinned as boolean | undefined,
    },
    content: markdownContent,
    raw: orig,
  };
}

/**
 * 序列化为 Markdown 文件
 * 将 metadata 和内容组合成带 frontmatter 的 markdown
 */
export function serializeMarkdown(
  content: string,
  metadata: PromptMetadata = {}
): string {
  const frontmatter: Record<string, unknown> = {};

  if (metadata.title) frontmatter.title = metadata.title;
  if (metadata.tags && metadata.tags.length > 0) frontmatter.tags = metadata.tags;
  if (metadata.created) frontmatter.created = metadata.created;
  if (metadata.modified) frontmatter.modified = metadata.modified;
  if (metadata.copyCount !== undefined) frontmatter.copyCount = metadata.copyCount;
  if (metadata.pinned !== undefined) frontmatter.pinned = metadata.pinned;

  // 如果没有 frontmatter 数据，直接返回内容
  if (Object.keys(frontmatter).length === 0) {
    return content;
  }

  return matter.stringify(content, frontmatter);
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
