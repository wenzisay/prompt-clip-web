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

export function toPortablePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function normalizeRelativePath(path: string): string {
  assertSafeRelativePath(path);

  const normalized = toPortablePath(path)
    .split('/')
    .filter((part) => part.length > 0)
    .join('/');

  return normalized;
}

export function joinPath(...parts: string[]): string {
  return normalizeRelativePath(parts.map(toPortablePath).join('/'));
}

export function assertSafeRelativePath(path: string): void {
  const portable = toPortablePath(path);
  const parts = portable.split('/');

  if (
    portable.length === 0 ||
    portable.startsWith('/') ||
    /^[A-Za-z]:/.test(portable) ||
    portable.startsWith('//') ||
    parts.some((part) => part === '..')
  ) {
    throw new Error('文件路径不合法');
  }
}

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '');

  if (!sanitized) {
    return 'untitled';
  }

  const reservedMatch = /^([^.]+)(\..*)?$/.exec(sanitized);
  const basename = reservedMatch?.[1] ?? sanitized;
  const extension = reservedMatch?.[2] ?? '';

  return RESERVED_WINDOWS_NAMES.has(basename.toUpperCase())
    ? `${basename}-${extension}`
    : sanitized;
}
