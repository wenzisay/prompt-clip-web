import { AgentToolIcon } from '@/components/common';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import { DEFAULT_CATEGORY_ID } from '@/constants/defaults';
import { findCategory } from '@/services/categoryService';

export function SkillFilterTabs() {
  const { t } = useTranslation();
  const {
    filter,
    tools,
    categories,
    setFavoritesOnly,
    setAgentToolFilter,
    setCategoryFilter,
  } = useSkillStore();
  const selectedAgent = filter.agentToolId
    ? tools.find((tool) => tool.id === filter.agentToolId)
    : undefined;
  // 选中的分类：默认类别或用户分类。选中后顶部以 chip 形式展示（与 Agent chip 一致）。
  const selectedCategory =
    filter.category === DEFAULT_CATEGORY_ID
      ? { id: DEFAULT_CATEGORY_ID, name: t.skills.defaultCategory }
      : filter.category
        ? findCategory(filter.category, { categories })
        : undefined;

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t.skills.title}>
      <FilterButton
        active={!filter.favoritesOnly && !selectedAgent && !selectedCategory}
        label={t.skills.all}
        onClick={() => setFavoritesOnly(false)}
      />
      <FilterButton
        active={filter.favoritesOnly && !selectedAgent && !selectedCategory}
        label={t.skills.favorites}
        onClick={() => setFavoritesOnly(true)}
      />

      {selectedAgent && (
        <div
          className="h-9 max-w-[240px] rounded-full bg-accent pl-4 pr-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)] inline-flex items-center gap-1.5"
          title={selectedAgent.name}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <AgentToolIcon iconId={selectedAgent.iconId} />
          </span>
          <span className="truncate">{selectedAgent.name}</span>
          <button
            type="button"
            onClick={() => setAgentToolFilter(null)}
            aria-label={t.skills.clearFilter}
            title={t.skills.clearFilter}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      )}

      {selectedCategory && (
        <div
          className="h-9 max-w-[240px] rounded-full bg-accent pl-4 pr-2 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)] inline-flex items-center gap-1.5"
          title={selectedCategory.name}
        >
          <span className="truncate">{selectedCategory.name}</span>
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            aria-label={t.skills.clearFilter}
            title={t.skills.clearFilter}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`
        h-9 min-w-[58px] rounded-full px-4 text-sm font-semibold transition-colors
        ${
          active
            ? 'bg-accent text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)]'
            : 'bg-surface-high text-muted hover:bg-surface-container hover:text-fg'
        }
      `}
    >
      {label}
    </button>
  );
}
