/**
 * 默认值常量
 */

import type { TagColor } from '@/types/tag';

/** 标签颜色列表 */
export const TAG_COLORS: TagColor[] = ['blue', 'purple', 'violet', 'gray'];

/** 默认标签颜色 */
export const DEFAULT_TAG_COLOR: TagColor = 'blue';

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
