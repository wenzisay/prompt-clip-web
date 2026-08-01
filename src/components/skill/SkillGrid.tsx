import type { AgentTool, SkillSummary } from '@/types/skill';
import { useTranslation } from '@/i18n';
import { Spinner } from '@/components/common';
import { SkillCard } from './SkillCard';

export interface SkillGridProps {
  skills: SkillSummary[];
  tools: AgentTool[];
  isLoading: boolean;
  onOpenSkill?: (skillId: string) => void;
  onExportSkill?: (skillId: string) => void;
  onDeleteSkill?: (skillId: string) => void;
}

export function SkillGrid({
  skills,
  tools,
  isLoading,
  onOpenSkill,
  onExportSkill,
  onDeleteSkill,
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
      <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined mb-3 text-6xl text-muted-light">extension_off</span>
        <h2 className="text-lg font-semibold text-fg">{t.skills.noSkills}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{t.skills.noSkillsHint}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
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
  );
}
