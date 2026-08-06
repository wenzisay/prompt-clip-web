/**
 * 默认值常量
 */

import type { TagColor } from '@/types/tag';

/** 标签颜色列表 */
export const TAG_COLORS: TagColor[] = ['blue', 'purple', 'violet', 'gray'];

/** 默认标签颜色 */
export const DEFAULT_TAG_COLOR: TagColor = 'blue';

/**
 * Skill 分类相关常量。
 *
 * 「默认类别」是一个虚拟分类：不可删除 / 不可重命名 / 不可被显式指派，
 * 任何未指派到用户分类的 Skill 自动归此。它不出现在 settings.categories 中，
 * 仅由这个保留 id 在筛选与计数逻辑中特判。
 */
export const DEFAULT_CATEGORY_ID = '__default__';

/** 分类名最大长度（字符数，与 Rust 校验保持一致）。 */
export const CATEGORY_NAME_MAX_LENGTH = 20;

/** 四语言「默认类别」文案与常见变体均为保留字（大小写不敏感比对）。 */
export const RESERVED_CATEGORY_NAMES = [
  '默认类别',
  '預設類別',
  'Default',
  'デフォルト',
];

/** 新 Prompt 默认模板 */
export const DEFAULT_PROMPT_TEMPLATE = `---
id: "{{ID}}"
title: "新 Prompt"
tags: []
created: "{{DATE}}"
modified: "{{DATE}}"
copy_count: 0
pinned: false
---

# Prompt 标题

在此输入 Prompt 内容...
`;

/** 空标签筛选 */
export const EMPTY_FILTER = {
  searchQuery: '',
  tag: null,
  favoritesOnly: false,
  recentOnly: false,
} as const;

/** 默认应用设置 */
export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  fontSize: 'medium' as const,
  autoSave: true,
  showLineNumbers: false,
} as const;

/** 字符统计格式 */
export const CHAR_COUNT_FORMAT = {
  THOUSAND: 'k',
  DECIMAL_PLACES: 1,
} as const;

/** 相对日期阈值 */
export const RELATIVE_DATE_THRESHOLDS = {
  TODAY: 0,
  YESTERDAY: 1,
  THIS_WEEK: 7,
  THIS_MONTH: 30,
} as const;
