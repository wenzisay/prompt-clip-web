import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';
import type { ArchivePreview, ImportDecision } from '@/types/skill';

export interface SkillArchiveImportModalProps {
  isOpen: boolean;
  preview: ArchivePreview | null;
  hasConflict: boolean;
  onClose: () => void;
  onConfirm: (decision: ImportDecision) => void;
}

export function SkillArchiveImportModal({
  isOpen,
  preview,
  hasConflict,
  onClose,
  onConfirm,
}: SkillArchiveImportModalProps) {
  const { t } = useTranslation();
  const [decision, setDecision] = useState<ImportDecision>('useExternal');
  useEffect(() => {
    if (isOpen) setDecision('useExternal');
  }, [isOpen, preview?.contentHash]);
  if (!preview) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.skills.archiveTitle} maxWidth="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-bg p-4">
          <h3 className="font-semibold text-fg">{preview.name}</h3>
          <p className="mt-1 text-sm text-muted">{preview.description}</p>
          <p className="mt-2 text-xs text-muted">{preview.entryCount} · {preview.expandedSize} B</p>
        </div>
        {hasConflict && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm text-amber-700">{t.skills.archiveConflict}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={decision === 'keepHub'} onChange={() => setDecision('keepHub')} />
              {t.skills.keepHub}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={decision === 'useExternal'} onChange={() => setDecision('useExternal')} />
              {t.skills.useExternal}
            </label>
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim">{t.skills.cancel}</button>
          <button type="button" onClick={() => onConfirm(hasConflict ? decision : 'useExternal')} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">{t.skills.confirmArchiveImport}</button>
        </div>
      </div>
    </Modal>
  );
}
