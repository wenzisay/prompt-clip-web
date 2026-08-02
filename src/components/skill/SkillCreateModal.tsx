import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';

export interface SkillCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (skillId: string, description: string) => void;
  isSubmitting?: boolean;
}

const SKILL_ID_PATTERN = /^(?!-)(?!.*--)[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function SkillCreateModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: SkillCreateModalProps) {
  const { t } = useTranslation();
  const [skillId, setSkillId] = useState('');
  const [description, setDescription] = useState('');
  const [showNameError, setShowNameError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSkillId('');
    setDescription('');
    setShowNameError(false);
  }, [isOpen]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedId = skillId.trim();
    const normalizedDescription = description.trim();
    const validName = normalizedId.length <= 64 && SKILL_ID_PATTERN.test(normalizedId);
    if (!validName) {
      setShowNameError(true);
      return;
    }
    if (!normalizedDescription || normalizedDescription.length > 500) return;
    onConfirm(normalizedId, normalizedDescription);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.skills.createTitle} maxWidth="lg">
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-fg">
          {t.skills.skillName}
          <input
            aria-label={t.skills.skillName}
            autoFocus
            value={skillId}
            onChange={(event) => {
              setSkillId(event.target.value);
              setShowNameError(false);
            }}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 outline-none focus:border-accent"
          />
          <span className="mt-1 block text-xs font-normal text-muted">{t.skills.skillNameHint}</span>
          {showNameError && <span className="mt-1 block text-xs text-red-600">{t.skills.invalidSkillName}</span>}
        </label>
        <label className="block text-sm font-medium text-fg">
          {t.skills.skillDescription}
          <textarea
            aria-label={t.skills.skillDescription}
            value={description}
            maxLength={500}
            required
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-border bg-bg p-3 outline-none focus:border-accent"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim">
            {t.skills.cancel}
          </button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {t.skills.confirmCreate}
          </button>
        </div>
      </form>
    </Modal>
  );
}
