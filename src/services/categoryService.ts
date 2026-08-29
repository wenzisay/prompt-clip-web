/**
 * Skill 分类服务（纯函数）
 *
 * 处理分类名校验、计数派生与查找等无副作用逻辑。
 * 不直接调用 IPC——持久化由 skillService 负责。
 */

import {
  CATEGORY_NAME_MAX_LENGTH,
  DEFAULT_CATEGORY_ID,
  RESERVED_CATEGORY_NAMES,
} from '@/constants/defaults';
import type { SkillCategory, SkillManagerSettings, SkillSummary } from '@/types/skill';

/** 名称校验失败时对应的错误码（与 i18n key 后缀一致）。 */
export type CategoryValidationCode =
  | 'categoryNameRequired'
  | 'categoryNameTooLong'
  | 'categoryNameReserved'
  | 'categoryNameDuplicate';

export interface CategoryValidationSuccess {
  ok: true;
  trimmed: string;
}
export interface CategoryValidationFailure {
  ok: false;
  code: CategoryValidationCode;
}
export type CategoryValidationResult = CategoryValidationSuccess | CategoryValidationFailure;

/**
 * 校验分类名：非空、长度 ≤ 上限、非保留字、大小写不敏感唯一。
 *
 * @param name 待校验的原始输入
 * @param existing 已有分类（用于重名校验）
 * @param excludeId 重命名时需排除自身的 id，避免把自己判为重名；新增时传 undefined
 */
export function validateCategoryName(
  name: string,
  existing: SkillCategory[],
  excludeId?: string
): CategoryValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, code: 'categoryNameRequired' };
  }
  if ([...trimmed].length > CATEGORY_NAME_MAX_LENGTH) {
    return { ok: false, code: 'categoryNameTooLong' };
  }
  if (isReservedCategoryName(trimmed)) {
    return { ok: false, code: 'categoryNameReserved' };
  }
  const lower = trimmed.toLowerCase();
  const duplicated = existing.some(
    (category) => category.id !== excludeId && category.name.toLowerCase() === lower
  );
  if (duplicated) {
    return { ok: false, code: 'categoryNameDuplicate' };
  }
  return { ok: true, trimmed };
}

/** 大小写不敏感地判断是否为保留字（四语言「默认类别」文案与常见变体）。 */
export function isReservedCategoryName(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED_CATEGORY_NAMES.some((reserved) => reserved.toLowerCase() === lower);
}

/** 每个分类的计数，键为分类 id；默认类别用 DEFAULT_CATEGORY_ID。 */
export type CategoryCounts = Record<string, number>;

/**
 * 基于 skills 与 settings 派生每个分类的 Skill 计数。
 * 默认类别计数 = categoryIds 为空的 Skill 数量。
 */
export function buildCategoryCounts(
  skills: SkillSummary[],
  settings: Pick<SkillManagerSettings, 'categories'>
): CategoryCounts {
  const counts: CategoryCounts = {};
  for (const category of settings.categories) {
    counts[category.id] = 0;
  }
  let defaultCount = 0;
  for (const skill of skills) {
    const ids = skill.categoryIds ?? [];
    if (ids.length === 0) {
      defaultCount += 1;
      continue;
    }
    for (const id of ids) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  counts[DEFAULT_CATEGORY_ID] = defaultCount;
  return counts;
}

/** 返回某 Skill 所属的分类 id 列表（空数组表示属于默认类别）。 */
export function categoriesForSkill(
  skillId: string,
  settings: Pick<SkillManagerSettings, 'skillCategories'>
): string[] {
  return settings.skillCategories[skillId] ?? [];
}

/** 根据 categoryId 查找分类对象（找不到返回 undefined）。 */
export function findCategory(
  categoryId: string,
  settings: Pick<SkillManagerSettings, 'categories'>
): SkillCategory | undefined {
  return settings.categories.find((category) => category.id === categoryId);
}

export const CategoryService = {
  validateCategoryName,
  isReservedCategoryName,
  buildCategoryCounts,
  categoriesForSkill,
  findCategory,
} as const;
