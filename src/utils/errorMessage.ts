const FILE_SYSTEM_ACCESS_DENIED_MESSAGE =
  '浏览器已阻止当前页面写入文件夹。请重新选择数据目录并授权读写权限后再保存。';

/**
 * 将保存失败的底层异常转换为用户可理解的提示。
 */
export function formatSaveErrorMessage(error: unknown): string {
  if (!isErrorLike(error)) {
    return '保存失败';
  }

  if (isFileSystemAccessDeniedError(error)) {
    return FILE_SYSTEM_ACCESS_DENIED_MESSAGE;
  }

  return error.message || '保存失败';
}

function isErrorLike(error: unknown): error is Error {
  if (error instanceof Error) {
    return true;
  }
  // jsdom 的 DOMException 不继承自 Error（与浏览器一致），但具备 name + message
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { name?: unknown }).name === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return true;
  }
  return false;
}

function isFileSystemAccessDeniedError(error: Error): boolean {
  if (error.name !== 'NotAllowedError') {
    return false;
  }
  if (error.message.includes("Failed to execute 'getFileHandle'")) {
    return true;
  }
  // jsdom 等环境在 throw DOMException 时 message 可能被截断：仅靠 name 也可识别
  return error.message.length === 0;
}
