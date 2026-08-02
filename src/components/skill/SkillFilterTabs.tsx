import { getAgentToolIcon } from '@/constants';
import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';

export function SkillFilterTabs() {
  const { t } = useTranslation();
  const { filter, tools, setFavoritesOnly } = useSkillStore();
  const selectedAgent = filter.agentToolId
    ? tools.find((tool) => tool.id === filter.agentToolId)
    : undefined;

  return (
    <div className="flex items-center gap-2" role="group" aria-label={t.skills.title}>
      <FilterButton
        active={!filter.favoritesOnly && !selectedAgent}
        label={t.skills.all}
        onClick={() => setFavoritesOnly(false)}
      />
      <FilterButton
        active={filter.favoritesOnly && !selectedAgent}
        label={t.skills.favorites}
        onClick={() => setFavoritesOnly(true)}
      />

      {selectedAgent && (
        <div
          className="h-9 max-w-[220px] rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)] inline-flex items-center gap-1.5"
          title={selectedAgent.name}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <img
              src={getAgentToolIcon(selectedAgent.iconId)}
              alt=""
              className="h-full w-full object-contain"
            />
          </span>
          <span className="truncate">{selectedAgent.name}</span>
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
