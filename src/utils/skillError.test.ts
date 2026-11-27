import { describe, expect, it } from 'vitest';
import { toSkillManagerError } from './skillError';

describe('toSkillManagerError', () => {
  it('preserves structured SkillManagerError code and params', () => {
    const result = toSkillManagerError(
      { code: 'skill_already_exists', params: { skillId: 'demo' } },
      { toolId: 'codex' }
    );

    expect(result).toEqual({
      code: 'skill_already_exists',
      params: { skillId: 'demo', toolId: 'codex' },
    });
  });

  it('wraps Error instances and raw strings into skill_unknown_error', () => {
    expect(toSkillManagerError(new Error('disk full'))).toEqual({
      code: 'skill_unknown_error',
      params: { message: 'disk full' },
    });

    expect(toSkillManagerError('permission denied')).toEqual({
      code: 'skill_unknown_error',
      params: { message: 'permission denied' },
    });
  });

  it('falls back cleanly for nullish or empty values', () => {
    expect(toSkillManagerError(null)).toEqual({
      code: 'skill_unknown_error',
      params: {},
    });
  });
});
