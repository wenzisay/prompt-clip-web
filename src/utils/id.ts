/**
 * ID 生成工具
 */

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数组合
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}`;
}

/**
 * 生成短 ID（用于 URL 或显示）
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * 从文件名生成 ID
 */
export function idFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * 从 ID 生成文件名
 */
export function filenameFromId(id: string): string {
  return `${id}.md`;
}
