import type { SkillManagerError } from '@/types/skill';

/**
 * 将任意异常归一化为结构化 SkillManagerError，便于映射到四语言可读文案。
 */
export function toSkillManagerError(
  error: unknown,
  extraParams: Record<string, string> = {}
): SkillManagerError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return {
      code: error.code,
      params: {
        ...('params' in error && typeof error.params === 'object' && error.params !== null
          ? (error.params as Record<string, string>)
          : {}),
        ...extraParams,
      },
    };
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return {
    code: 'skill_unknown_error',
    params: {
      ...(message ? { message } : {}),
      ...extraParams,
    },
  };
}
