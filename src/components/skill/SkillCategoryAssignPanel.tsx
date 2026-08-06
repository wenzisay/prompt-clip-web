/**
 * Skill 分类指派面板
 *
 * 在 SkillCard 菜单「添加到分类」中展开，列出所有用户自建分类（不含默认类别），
 * 复选框多选即时持久化。支持全选 / 全不选，以及方向键 + 空格 + Esc 键盘操作。
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import type { SkillSummary } from '@/types/skill';

export interface SkillCategoryAssignPanelProps {
  skill: SkillSummary;
  onClose: () => void;
}

export function SkillCategoryAssignPanel({ skill, onClose }: SkillCategoryAssignPanelProps) {
  const { t } = useTranslation();
  const { categories, setSkillCategories } = useSkillStore();
  const listRef = useRef<HTMLDivElement>(null);

  const selected = new Set(skill.categoryIds);
  const allSelected = categories.length > 0 && categories.every((c) => selected.has(c.id));

  // 进入面板时把焦点放到列表容器，便于键盘操作。
  useEffect(() => {
    listRef.current?.focus();
  }, []);

  const persist = async (next: string[]) => {
    await setSkillCategories(skill.id, next);
  };

  const toggle = (categoryId: string) => {
    const next = selected.has(categoryId)
      ? skill.categoryIds.filter((id) => id !== categoryId)
      : [...skill.categoryIds, categoryId];
    void persist(next);
  };

  const toggleAll = () => {
    void persist(allSelected ? [] : categories.map((c) => c.id));
  };

  // 键盘：方向键移动焦点、空格勾选、Esc 关闭。
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-category-item]');
    if (!items || items.length === 0) return;
    const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    }
  };

  if (categories.length === 0) {
    return (
      <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-surface py-2 shadow-card">
        <p className="px-3 py-2 text-sm text-muted">{t.skills.noSkillsInCategory}</p>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-surface py-1 shadow-card"
    >
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t.skills.addToCategory}
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-accent hover:underline"
        >
          {allSelected ? t.skills.deselectAll : t.skills.selectAll}
        </button>
      </div>
      <ul className="max-h-60 overflow-y-auto">
        {categories.map((category) => {
          const isChecked = selected.has(category.id);
          return (
            <li key={category.id}>
              <button
                type="button"
                data-category-item
                role="menuitemcheckbox"
                aria-checked={isChecked}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(category.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg transition-colors hover:bg-surface-dim"
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    isChecked ? 'text-accent' : 'text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  check
                </span>
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
