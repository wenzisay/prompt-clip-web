import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';

export interface SkillConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  note?: string;
  confirmLabel?: string;
  /** 危险操作（删除等），确认按钮渲染为红色 */
  danger?: boolean;
  isSubmitting?: boolean;
}

/**
 * 通用确认弹窗，用于 Skill 编辑页的「删除条目 / 放弃未保存修改」。
 * 取代 Tauri webview 中行为不一致的 window.confirm。
 */
export function SkillConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  note,
  confirmLabel,
  danger = false,
  isSubmitting = false,
}: SkillConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="space-y-4">
        <p className="text-fg">{message}</p>
        {note && <p className="text-sm leading-6 text-muted">{note}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm text-muted hover:bg-surface-dim disabled:opacity-50"
          >
            {t.skills.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              danger ? 'bg-red-600' : 'bg-accent'
            }`}
          >
            {confirmLabel ?? t.skills.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
