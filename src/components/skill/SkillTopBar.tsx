import { useTranslation } from '@/i18n';
import { useSkillStore } from '@/stores/skillStore';

export interface SkillTopBarProps {
  onCreate?: () => void;
  onUpload?: () => void;
  onRescan?: () => void;
  onQuickSwitch?: () => void;
}

export function SkillTopBar({
  onCreate,
  onUpload,
  onRescan,
  onQuickSwitch,
}: SkillTopBarProps) {
  const { t } = useTranslation();
  const { skills, filter, setSearchQuery, load, rescanExternal } = useSkillStore();

  const handleRescan = () => {
    if (onRescan) {
      onRescan();
      return;
    }
    void Promise.all([load(), rescanExternal()]);
  };

  return (
    <header className="border-b border-border bg-surface px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="mr-2 shrink-0">
          <h1 className="font-display text-xl font-bold text-fg">{t.skills.title}</h1>
          <p className="text-xs font-medium text-accent">
            {t.skills.hubSkillCount(skills.length)}
          </p>
        </div>

        <div className="relative min-w-[220px] max-w-[520px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[21px] text-muted">
            search
          </span>
          <input
            type="search"
            name="skill-search"
            value={filter.searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t.skills.searchPlaceholder}
            className="h-10 w-full rounded-xl border border-border bg-bg pl-10 pr-28 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <button
            type="button"
            aria-label={t.skills.quickSwitch}
            onClick={onQuickSwitch}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-dim px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-high hover:text-fg"
          >
            {t.skills.quickSwitch}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ActionButton
            icon="refresh"
            label={t.skills.refresh}
            title={t.skills.refreshHint}
            onClick={handleRescan}
          />
          <ActionButton icon="upload" label={t.skills.upload} onClick={onUpload} />
          <ActionButton icon="add" label={t.skills.create} onClick={onCreate} primary />
        </div>
      </div>
    </header>
  );
}

function ActionButton({
  icon,
  label,
  title,
  onClick,
  primary = false,
}: {
  icon: string;
  label: string;
  title?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
        primary
          ? 'bg-accent text-white hover:opacity-90'
          : 'text-muted hover:bg-surface-dim hover:text-fg'
      }`}
    >
      <span className="material-symbols-outlined text-[19px]">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
