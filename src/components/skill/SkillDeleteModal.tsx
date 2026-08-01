import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';
import type { SkillDeleteMode, SkillSummary } from '@/types/skill';

export interface SkillDeleteModalProps {
  skill: SkillSummary | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (mode: SkillDeleteMode) => void;
}

export function SkillDeleteModal({
  skill,
  isDeleting,
  onClose,
  onConfirm,
}: SkillDeleteModalProps) {
  const { t } = useTranslation();
  if (!skill) return null;

  const hasManagedTargets = Object.values(skill.toolStates).some(
    (state) => state.status === 'enabled' || state.status === 'stale'
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t.skills.deleteSkillTitle}
      maxWidth="md"
      closeLabel={t.skills.close}
      closeOnOverlayClick={!isDeleting}
      closeOnEscape={!isDeleting}
    >
      <div className="space-y-4">
        <p className="text-fg">{t.skills.deleteSkillConfirm(skill.name)}</p>
        <p className="text-sm leading-6 text-muted">
          {hasManagedTargets ? t.skills.deleteManagedSkillNote : t.skills.deleteSkillNote}
        </p>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-dim disabled:opacity-50"
          >
            {t.skills.cancel}
          </button>
          {hasManagedTargets && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onConfirm('hubOnly')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-dim disabled:opacity-50"
            >
              {t.skills.deletePromptClipOnly}
            </button>
          )}
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm('all')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {hasManagedTargets ? t.skills.deleteEverywhere : t.skills.deleteSkill}
          </button>
        </div>
      </div>
    </Modal>
  );
}
