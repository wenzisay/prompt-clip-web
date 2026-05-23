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
  return error instanceof Error;
}

function isFileSystemAccessDeniedError(error: Error): boolean {
  return (
    error.name === 'NotAllowedError' &&
    error.message.includes("Failed to execute 'getFileHandle'")
  );
}
