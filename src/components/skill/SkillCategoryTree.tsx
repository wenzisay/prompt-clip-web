/**
 * Skill 分类侧栏树
 *
 * 在 Skills 侧栏 Agents 列表下方渲染分类区：一个置顶的「默认类别」（虚拟收纳桶，
 * 不可删除 / 重命名 / 指派）与用户自建分类。复用 Prompts 标签的哈希配色，
 * 视觉与交互对齐 TagTree。
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import { TagService } from '@/services/tagService';
import { validateCategoryName } from '@/services/categoryService';
import { DEFAULT_CATEGORY_ID } from '@/constants/defaults';
import { SkillConfirmModal } from './SkillConfirmModal';
import { SkillNamePromptModal } from './SkillNamePromptModal';

const COLOR_DOT: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  violet: 'bg-violet-500',
  gray: 'bg-gray-400',
};

interface ModalState {
  type: 'add' | 'rename' | 'delete';
  categoryId?: string;
  categoryName?: string;
}

export function SkillCategoryTree() {
  const { t } = useTranslation();
  const {
    categories,
    categoryCounts,
    filter,
    addCategory,
    renameCategory,
    deleteCategory,
    setCategoryFilter,
    error,
  } = useSkillStore();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 后端返回的错误码会同步进 store.error；在此映射为可读文案并在关闭弹窗时清空。
  useEffect(() => {
    if (error && modal) {
      const key = categoryErrorKey(error.code);
      if (key) setValidationError(t.skills[key]);
    }
  }, [error, modal, t]);

  const closeModal = () => {
    setModal(null);
    setValidationError(null);
    setIsBusy(false);
  };

  const handleAdd = async (name: string) => {
    const result = validateCategoryName(name, categories);
    if (!result.ok) {
      setValidationError(t.skills[categoryErrorKey(result.code)]);
      return;
    }
    setIsBusy(true);
    const ok = await addCategory(result.trimmed);
    if (ok) closeModal();
    else setIsBusy(false);
  };

  const handleRename = async (name: string) => {
    if (!modal?.categoryId) return;
    const result = validateCategoryName(name, categories, modal.categoryId);
    if (!result.ok) {
      setValidationError(t.skills[categoryErrorKey(result.code)]);
      return;
    }
    setIsBusy(true);
    const ok = await renameCategory(modal.categoryId, result.trimmed);
    if (ok) closeModal();
    else setIsBusy(false);
  };

  const handleDelete = async () => {
    if (!modal?.categoryId) return;
    setIsBusy(true);
    const ok = await deleteCategory(modal.categoryId);
    if (ok) closeModal();
    else setIsBusy(false);
  };

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t.skills.categories}
        </h2>
        <button
          type="button"
          onClick={() => {
            setValidationError(null);
            setModal({ type: 'add' });
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-dim hover:text-fg"
          aria-label={t.skills.addCategory}
          title={t.skills.addCategory}
        >
          <span className="material-symbols-outlined text-base">add</span>
        </button>
      </div>

      {/* 默认类别（置顶、不可操作） */}
      <CategoryRow
        name={t.skills.defaultCategory}
        count={categoryCounts[DEFAULT_CATEGORY_ID] ?? 0}
        isActive={filter.category === DEFAULT_CATEGORY_ID}
        onClick={() => setCategoryFilter(DEFAULT_CATEGORY_ID)}
      />

      {/* 用户自建分类 */}
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {categories.map((category) => (
          <li key={category.id}>
            <UserCategoryRow
              name={category.name}
              count={categoryCounts[category.id] ?? 0}
              color={TagService.getTagColor(category.name)}
              isActive={filter.category === category.id}
              onClick={() => setCategoryFilter(category.id)}
              onRename={() => {
                setValidationError(null);
                setModal({ type: 'rename', categoryId: category.id, categoryName: category.name });
              }}
              onDelete={() => {
                setValidationError(null);
                setModal({ type: 'delete', categoryId: category.id, categoryName: category.name });
              }}
            />
          </li>
        ))}
      </ul>

      {/* 新增分类 */}
      {modal?.type === 'add' && (
        <SkillNamePromptModal
          isOpen
          onClose={closeModal}
          onSubmit={handleAdd}
          title={t.skills.addCategory}
          label={t.skills.categoryName}
          placeholder={t.skills.categoryNamePlaceholder}
          confirmLabel={t.skills.confirmCreate}
          isSubmitting={isBusy}
        />
      )}

      {/* 重命名分类 */}
      {modal?.type === 'rename' && (
        <SkillNamePromptModal
          isOpen
          onClose={closeModal}
          onSubmit={handleRename}
          title={t.skills.renameCategory}
          label={t.skills.categoryName}
          placeholder={t.skills.categoryNamePlaceholder}
          initialValue={modal.categoryName}
          confirmLabel={t.skills.confirm}
          isSubmitting={isBusy}
        />
      )}

      {/* 删除分类 */}
      {modal?.type === 'delete' && (
        <SkillConfirmModal
          isOpen
          onClose={closeModal}
          onConfirm={handleDelete}
          title={t.skills.deleteCategory}
          message={t.skills.deleteCategoryConfirm(modal.categoryName ?? '')}
          note={t.skills.deleteCategoryNote}
          confirmLabel={t.skills.delete}
          danger
          isSubmitting={isBusy}
        />
      )}

      {validationError && (
        <p className="mt-2 px-2 text-xs text-red-600">{validationError}</p>
      )}
    </div>
  );
}

interface CategoryRowProps {
  name: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function CategoryRow({ name, count, isActive, onClick }: CategoryRowProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      title={name}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
        isActive ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-surface-dim'
      }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_DOT.gray}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <span className={`shrink-0 text-xs ${isActive ? 'text-accent' : 'text-muted'}`}>{count}</span>
    </button>
  );
}

interface UserCategoryRowProps {
  name: string;
  count: number;
  color: 'blue' | 'purple' | 'violet' | 'gray';
  isActive: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function UserCategoryRow({
  name,
  count,
  color,
  isActive,
  onClick,
  onRename,
  onDelete,
}: UserCategoryRowProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        isActive ? 'bg-accent-soft text-accent' : 'hover:bg-surface-dim'
      }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${COLOR_DOT[color]}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <span className={`shrink-0 text-xs ${isActive ? 'text-accent' : 'text-muted'}`}>{count}</span>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((value) => !value);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-surface-high group-hover:opacity-100"
          aria-label={t.app.moreActions}
          title={t.app.moreActions}
        >
          <span className="material-symbols-outlined text-base">more_horiz</span>
        </button>
        {isMenuOpen && (
          <div
            className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-surface py-1 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onRename();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-dim"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
              {t.skills.renameCategory}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
              {t.skills.delete}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 把后端错误码 / 校验码映射到对应的 i18n key 后缀。 */
function categoryErrorKey(
  code: string
):
  | 'categoryNameRequired'
  | 'categoryNameTooLong'
  | 'categoryNameDuplicate'
  | 'categoryNameReserved' {
  switch (code) {
    case 'skill_category_name_required':
    case 'categoryNameRequired':
      return 'categoryNameRequired';
    case 'skill_category_name_too_long':
    case 'categoryNameTooLong':
      return 'categoryNameTooLong';
    case 'skill_category_name_duplicate':
    case 'categoryNameDuplicate':
      return 'categoryNameDuplicate';
    case 'skill_category_name_reserved':
    case 'categoryNameReserved':
    default:
      return 'categoryNameReserved';
  }
}
