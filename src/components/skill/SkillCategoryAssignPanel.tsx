/**
 * Skill 分类指派面板
 *
 * 在 SkillCard 菜单「添加到分类」中展开，列出所有用户自建分类（不含默认类别），
 * 复选框多选即时持久化。支持全选 / 全不选、内联快速新建并自动勾选，
 * 以及方向键 + 空格 + Esc 键盘操作。
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import { validateCategoryName, type CategoryValidationCode } from '@/services/categoryService';
import type { SkillSummary } from '@/types/skill';

export interface SkillCategoryAssignPanelProps {
  skill: SkillSummary;
  onClose: () => void;
}

export function SkillCategoryAssignPanel({ skill, onClose }: SkillCategoryAssignPanelProps) {
  const { t } = useTranslation();
  const { categories, addCategory, setSkillCategories } = useSkillStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selected = new Set(skill.categoryIds);
  const allSelected = categories.length > 0 && categories.every((c) => selected.has(c.id));

  // 有分类时把焦点放到列表容器，便于方向键操作；无分类时保留给新建输入框。
  useEffect(() => {
    if (categories.length > 0) {
      listRef.current?.focus();
    }
  }, [categories.length]);

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

  const handleQuickCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isCreating) return;
    const result = validateCategoryName(newName, categories);
    if (!result.ok) {
      setValidationError(t.skills[validationMessageKey(result.code)]);
      return;
    }
    setValidationError(null);
    setIsCreating(true);
    try {
      const ok = await addCategory(result.trimmed);
      if (!ok) {
        const storeError = useSkillStore.getState().error;
        if (storeError) {
          setValidationError(t.skills[backendErrorMessageKey(storeError.code)]);
        }
        return;
      }
      const created = useSkillStore
        .getState()
        .categories.find(
          (category) => category.name.toLowerCase() === result.trimmed.toLowerCase()
        );
      if (created && !skill.categoryIds.includes(created.id)) {
        await setSkillCategories(skill.id, [...skill.categoryIds, created.id]);
      }
      setNewName('');
    } finally {
      setIsCreating(false);
    }
  };

  // 键盘：方向键移动焦点、空格勾选、Esc 关闭（输入框聚焦时不拦截方向键）。
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (document.activeElement?.tagName === 'INPUT') return;
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

  return (
    <div
      ref={listRef}
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full z-40 mt-1 w-60 rounded-lg border border-border bg-surface py-1 shadow-card"
    >
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t.skills.addToCategory}
        </span>
        {categories.length > 0 && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleAll();
            }}
            className="text-xs text-accent hover:underline"
          >
            {allSelected ? t.skills.deselectAll : t.skills.selectAll}
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted">{t.skills.noCategoriesYet}</p>
      ) : (
        <ul className="max-h-52 overflow-y-auto">
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
      )}

      <form
        onSubmit={(event) => void handleQuickCreate(event)}
        className="mt-1 border-t border-border px-2.5 pb-1.5 pt-2"
      >
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newName}
            disabled={isCreating}
            onChange={(event) => {
              setNewName(event.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder={t.skills.quickCreateCategoryPlaceholder}
            aria-label={t.skills.addCategory}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg px-2 text-xs text-fg outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            aria-label={t.skills.addCategory}
            title={t.skills.addCategory}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
          </button>
        </div>
        {validationError && (
          <p className="mt-1.5 text-xs text-red-600">{validationError}</p>
        )}
      </form>
    </div>
  );
}

function validationMessageKey(
  code: CategoryValidationCode
): CategoryValidationCode {
  return code;
}

function backendErrorMessageKey(code: string): CategoryValidationCode {
  switch (code) {
    case 'skill_category_name_required':
      return 'categoryNameRequired';
    case 'skill_category_name_too_long':
      return 'categoryNameTooLong';
    case 'skill_category_name_duplicate':
      return 'categoryNameDuplicate';
    case 'skill_category_name_reserved':
    default:
      return 'categoryNameReserved';
  }
}
