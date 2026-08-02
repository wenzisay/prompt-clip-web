import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';

export function SkillFilterTabs() {
  const { t } = useTranslation();
  const { filter, setFavoritesOnly } = useSkillStore();

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t.skills.title}>
      <FilterButton
        active={!filter.favoritesOnly}
        label={t.skills.all}
        onClick={() => setFavoritesOnly(false)}
      />
      <FilterButton
        active={filter.favoritesOnly}
        label={t.skills.favorites}
        onClick={() => setFavoritesOnly(true)}
      />
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
