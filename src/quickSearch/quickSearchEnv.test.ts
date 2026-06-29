import { describe, it, expect } from 'vitest';
import { isQuickSearchWindowLocation } from './quickSearchEnv';

describe('isQuickSearchWindowLocation', () => {
  it('should return true for the quick-search window param', () => {
    expect(isQuickSearchWindowLocation('?window=quick-search')).toBe(true);
  });

  it('should return false for empty search string', () => {
    expect(isQuickSearchWindowLocation('')).toBe(false);
  });

  it('should return false for other window values', () => {
    expect(isQuickSearchWindowLocation('?window=main')).toBe(false);
  });

  it('should return false when window param is absent', () => {
    expect(isQuickSearchWindowLocation('?foo=bar')).toBe(false);
  });

  it('should ignore unrelated params and still match', () => {
    expect(isQuickSearchWindowLocation('?foo=bar&window=quick-search')).toBe(true);
  });
});
