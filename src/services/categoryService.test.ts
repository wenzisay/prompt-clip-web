import { describe, expect, it } from 'vitest';
import {
  buildCategoryCounts,
  categoriesForSkill,
  findCategory,
  isReservedCategoryName,
  validateCategoryName,
} from './categoryService';
import { DEFAULT_CATEGORY_ID } from '@/constants/defaults';
import type { SkillCategory, SkillManagerSettings, SkillSummary } from '@/types/skill';

const categories: SkillCategory[] = [
  { id: 'c1', name: 'Work', createdAt: '2026-08-01T00:00:00Z' },
  { id: 'c2', name: 'Personal', createdAt: '2026-08-02T00:00:00Z' },
];

const settings = { categories } as Pick<SkillManagerSettings, 'categories'>;

function skill(id: string, categoryIds: string[] = []): SkillSummary {
  return {
    id,
    name: id,
    description: id,
    relativePath: id,
    contentHash: `${id}-hash`,
    favoritedAt: null,
    categoryIds,
    toolStates: {},
  };
}

describe('validateCategoryName', () => {
  it('accepts a unique non-empty name', () => {
    const result = validateCategoryName('New Cat', categories);
    expect(result).toEqual({ ok: true, trimmed: 'New Cat' });
  });

  it('trims surrounding whitespace', () => {
    expect(validateCategoryName('  Drafts  ', categories)).toEqual({
      ok: true,
      trimmed: 'Drafts',
    });
  });

  it('rejects empty / whitespace-only names', () => {
    expect(validateCategoryName('   ', categories)).toEqual({
      ok: false,
      code: 'categoryNameRequired',
    });
  });

  it('rejects names longer than the limit', () => {
    expect(validateCategoryName('abcdefghijklmnopqrstuvwxyz', categories)).toEqual({
      ok: false,
      code: 'categoryNameTooLong',
    });
  });

  it('rejects duplicates case-insensitively', () => {
    expect(validateCategoryName('work', categories)).toEqual({
      ok: false,
      code: 'categoryNameDuplicate',
    });
  });

  it('ignores the excludeId when renaming itself', () => {
    expect(validateCategoryName('WORK', categories, 'c1')).toEqual({
      ok: true,
      trimmed: 'WORK',
    });
  });

  it('rejects reserved words (all four locales)', () => {
    for (const reserved of ['Default', '默认类别', '預設類別', 'デフォルト']) {
      expect(validateCategoryName(reserved, [])).toEqual({
        ok: false,
        code: 'categoryNameReserved',
      });
    }
  });
});

describe('isReservedCategoryName', () => {
  it('is case-insensitive', () => {
    expect(isReservedCategoryName('DEFAULT')).toBe(true);
    expect(isReservedCategoryName('drafts')).toBe(false);
  });
});

describe('buildCategoryCounts', () => {
  it('counts skills per category and derives default category count', () => {
    const skills = [
      skill('a', ['c1']),
      skill('b', ['c1', 'c2']),
      skill('c', []), // default
      skill('d'), // default (undefined categoryIds)
    ];
    const counts = buildCategoryCounts(skills, settings);
    expect(counts['c1']).toBe(2);
    expect(counts['c2']).toBe(1);
    expect(counts[DEFAULT_CATEGORY_ID]).toBe(2);
  });

  it('initializes all known categories to 0 when no skills', () => {
    const counts = buildCategoryCounts([], settings);
    expect(counts['c1']).toBe(0);
    expect(counts['c2']).toBe(0);
    expect(counts[DEFAULT_CATEGORY_ID]).toBe(0);
  });

  it('counts orphan ids (not in settings) under their id without crashing', () => {
    const skills = [skill('a', ['ghost'])];
    const counts = buildCategoryCounts(skills, settings);
    expect(counts['c1']).toBe(0);
    expect(counts[DEFAULT_CATEGORY_ID]).toBe(0);
    expect(counts['ghost']).toBe(1);
  });
});

describe('categoriesForSkill', () => {
  it('returns the stored list or empty array when absent', () => {
    const withMap = {
      ...settings,
      skillCategories: { 'a': ['c1', 'c2'] },
    } as Pick<SkillManagerSettings, 'categories' | 'skillCategories'>;
    expect(categoriesForSkill('a', withMap)).toEqual(['c1', 'c2']);
    expect(categoriesForSkill('missing', withMap)).toEqual([]);
  });
});

describe('findCategory', () => {
  it('finds by id or returns undefined', () => {
    expect(findCategory('c2', settings)?.name).toBe('Personal');
    expect(findCategory('nope', settings)).toBeUndefined();
  });
});
