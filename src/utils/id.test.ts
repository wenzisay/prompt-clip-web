import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateStableId, isStableId } from './id';

describe('id utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates a stable id from timestamp and four random digits', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1747477200123);
    vi.spyOn(Math, 'random').mockReturnValue(0.4567);

    expect(generateStableId()).toBe('17474772001234567');
  });

  it('recognizes only 17 digit stable id strings', () => {
    expect(isStableId('17474772001234567')).toBe(true);
    expect(isStableId('1747477200123456')).toBe(false);
    expect(isStableId('174747720012345678')).toBe(false);
    expect(isStableId('1747477200123456a')).toBe(false);
    expect(isStableId(123)).toBe(false);
  });
});
