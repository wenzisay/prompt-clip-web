import { describe, expect, it } from 'vitest';
import { formatSaveErrorMessage } from './errorMessage';

describe('formatSaveErrorMessage', () => {
  it('returns a readable permission message for blocked file handle writes', () => {
    const error = new DOMException(
      "Failed to execute 'getFileHandle' on 'FileSystemDirectoryHandle': "
        + 'The request is not allowed by the user agent or the platform in the current context.',
      'NotAllowedError'
    );

    expect(formatSaveErrorMessage(error)).toBe(
      '浏览器已阻止当前页面写入文件夹。请重新选择数据目录并授权读写权限后再保存。'
    );
  });

  it('keeps existing save error messages when they are already specific', () => {
    expect(formatSaveErrorMessage(new Error('标题已存在'))).toBe('标题已存在');
  });

  it('uses a generic fallback for unknown errors', () => {
    expect(formatSaveErrorMessage('boom')).toBe('保存失败');
  });
});
