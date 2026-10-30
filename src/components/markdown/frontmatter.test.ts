import { describe, expect, it } from 'vitest';
import { getFrontmatterProtectedLineNumbers } from './frontmatter';

describe('getFrontmatterProtectedLineNumbers', () => {
  it('returns line numbers for a closed frontmatter block', () => {
    const doc = '---\ntitle: x\n---\n\nbody';
    expect([...getFrontmatterProtectedLineNumbers(doc)].sort()).toEqual([1, 2, 3, 4]);
  });

  it('returns empty set when no frontmatter', () => {
    expect(getFrontmatterProtectedLineNumbers('# Title only').size).toBe(0);
  });
});
