import type { AgentTool, SkillSummary } from '@/types/skill';
import { useTranslation } from '@/i18n';
import { Spinner } from '@/components/common';
import { SkillCard } from './SkillCard';
import { SkillFilterTabs } from './SkillFilterTabs';

export interface SkillGridProps {
  skills: SkillSummary[];
  tools: AgentTool[];
  isLoading: boolean;
  hasAnyHubSkills?: boolean;
  onOpenSkill?: (skillId: string) => void;
  onExportSkill?: (skillId: string) => void;
  onDeleteSkill?: (skillId: string) => void;
  onRescan?: () => void;
  onCreateSkill?: () => void;
}

export function SkillGrid({
  skills,
  tools,
  isLoading,
  hasAnyHubSkills = false,
  onOpenSkill,
  onExportSkill,
  onDeleteSkill,
  onRescan,
  onCreateSkill,
}: SkillGridProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
        <Spinner size="lg" />
        <span className="text-sm">{t.skills.loading}</span>
      </div>
    );
  }
  if (skills.length === 0) {
    return (
      <div className="space-y-4">
        <SkillFilterTabs />
        <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined mb-3 text-6xl text-muted-light">
            {hasAnyHubSkills ? 'search_off' : 'extension_off'}
          </span>
          <h2 className="text-lg font-semibold text-fg">
            {hasAnyHubSkills ? t.skills.noMatchingSkills : t.skills.noSkills}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            {hasAnyHubSkills ? t.skills.noMatchingSkillsHint : t.skills.noSkillsHint}
          </p>
          {!hasAnyHubSkills && (onRescan || onCreateSkill) && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {onRescan && (
                <button
                  type="button"
                  onClick={onRescan}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    refresh
                  </span>
                  {t.skills.refresh}
                </button>
              )}
              {onCreateSkill && (
                <button
                  type="button"
                  onClick={onCreateSkill}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-fg transition hover:bg-surface-dim"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    add
                  </span>
                  {t.skills.create}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SkillFilterTabs />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(400px,100%),1fr))] gap-4">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            tools={tools}
            onOpen={onOpenSkill}
            onExport={onExportSkill}
            onDelete={onDeleteSkill}
          />
        ))}
      </div>
    </div>
  );
}
