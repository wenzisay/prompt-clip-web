/**
 * 日期格式化工具函数
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

/**
 * 格式化相对日期（今天、昨天、X 天前）
 */
export function formatDate(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < SECONDS_PER_MINUTE) {
    return '刚刚';
  }

  if (diffInSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffInSeconds / SECONDS_PER_MINUTE);
    return `${minutes} 分钟前`;
  }

  if (diffInSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffInSeconds / SECONDS_PER_HOUR);
    return `${hours} 小时前`;
  }

  if (diffInSeconds < SECONDS_PER_WEEK) {
    const days = Math.floor(diffInSeconds / SECONDS_PER_DAY);
    if (days === 1) return '昨天';
    if (days === 2) return '前天';
    return `${days} 天前`;
  }

  const weeks = Math.floor(diffInSeconds / SECONDS_PER_WEEK);
  if (weeks < 4) {
    return `${weeks} 周前`;
  }

  const months = Math.floor(weeks / 4);
  if (months < 12) {
    return `${months} 个月前`;
  }

  const years = Math.floor(months / 12);
  return `${years} 年前`;
}

/**
 * 格式化完整日期（YYYY-MM-DD）
 */
export function formatDateFull(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间（YYYY-MM-DD HH:mm）
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDateFull(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 解析 ISO 日期字符串
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * 判断是否为今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
