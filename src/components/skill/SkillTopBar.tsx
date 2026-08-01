import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';
import { useUIStore } from '@/stores/uiStore';

export interface SkillTopBarProps {
  onCreate?: () => void;
  onUpload?: () => void;
  onRescan?: () => void;
  onQuickSwitch?: () => void;
  onSettings?: () => void;
}

export function SkillTopBar({
  onCreate,
  onUpload,
  onRescan,
  onQuickSwitch,
  onSettings,
}: SkillTopBarProps) {
  const { t } = useTranslation();
  const { skills, filter, setSearchQuery, setFavoritesOnly, load, rescanExternal } =
    useSkillStore();
  const setAppSection = useUIStore((state) => state.setAppSection);

  const handleRescan = () => {
    if (onRescan) {
      onRescan();
      return;
    }
    void Promise.all([load(), rescanExternal()]);
  };

  return (
    <header className="border-b border-border bg-surface px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAppSection('prompts')}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted transition hover:bg-surface-dim hover:text-fg"
        >
          <span className="material-symbols-outlined text-[19px]">arrow_back</span>
          {t.skills.managePrompts}
        </button>
        <div className="mr-2">
          <h1 className="font-display text-xl font-bold text-fg">{t.skills.title}</h1>
          <p className="text-xs text-muted">{t.skills.subtitle}</p>
          <p className="text-xs font-medium text-accent">
            {t.skills.hubSkillCount(skills.length)}
          </p>
        </div>

        <label className="relative min-w-[220px] flex-1 max-w-[520px]">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[21px] text-muted">
            search
          </span>
          <input
            type="search"
            value={filter.searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t.skills.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-border bg-bg pl-10 pr-3 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          <ActionButton icon="bolt" label={t.skills.quickSwitch} onClick={onQuickSwitch} />
          <ActionButton icon="refresh" label={t.skills.refresh} onClick={handleRescan} />
          <ActionButton icon="upload" label={t.skills.upload} onClick={onUpload} />
          <ActionButton icon="settings" label={t.skills.settings} onClick={onSettings} />
          <ActionButton icon="add" label={t.skills.create} onClick={onCreate} primary />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2" role="group" aria-label={t.skills.title}>
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
    </header>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
        primary
          ? 'bg-accent text-white hover:opacity-90'
          : 'text-muted hover:bg-surface-dim hover:text-fg'
      }`}
    >
      <span className="material-symbols-outlined text-[19px]">{icon}</span>
      <span className="hidden 2xl:inline">{label}</span>
    </button>
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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-dim'
      }`}
    >
      {label}
    </button>
  );
}
