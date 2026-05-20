/**
 * 文件名和 ID 工具
 */

const RESERVED_WINDOWS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/;
const MAX_FILENAME_BASENAME_LENGTH = 120;
const STABLE_ID_PATTERN = /^\d{17}$/;

/**
 * 生成短 ID（用于 URL 或显示）
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * 生成稳定 ID 候选值
 */
export function generateStableId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${randomSuffix}`;
}

/**
 * 校验是否为稳定 ID
 */
export function isStableId(value: unknown): value is string {
  return typeof value === 'string' && STABLE_ID_PATTERN.test(value);
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

/**
 * 从 Prompt 标题生成 md 文件名
 */
export function filenameFromTitle(title: string): string {
  return `${title.trim()}.md`;
}

/**
 * 校验可用作文件名的 Prompt 标题
 */
export function validatePromptTitleForFilename(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return '请输入标题';
  }

  if (trimmed.length > MAX_FILENAME_BASENAME_LENGTH) {
    return `标题不能超过 ${MAX_FILENAME_BASENAME_LENGTH} 个字符`;
  }

  if (INVALID_FILENAME_CHARS.test(trimmed) || hasControlCharacter(trimmed)) {
    return '标题不能包含文件名非法字符：< > : " / \\ | ? *';
  }

  if (trimmed.endsWith('.') || trimmed.endsWith(' ')) {
    return '标题不能以空格或句点结尾';
  }

  if (RESERVED_WINDOWS_NAMES.has(trimmed.toUpperCase())) {
    return '标题不能使用系统保留文件名';
  }

  return null;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => char.charCodeAt(0) < 32);
}

/**
 * 格式化日期为文件名时间格式（YYYY-MM-DD-HHMMSS）
 */
export function formatDateForFile(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}
