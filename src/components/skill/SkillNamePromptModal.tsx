import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useTranslation } from '@/i18n';

export interface SkillNamePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel: string;
  isSubmitting?: boolean;
}

/**
 * 通用文本输入弹窗，用于 Skill 编辑页的「新建文件夹 / 新建文件 / 重命名」。
 * 取代 Tauri webview 中不可用的 window.prompt。
 */
export function SkillNamePromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  initialValue = '',
  confirmLabel,
  isSubmitting = false,
}: SkillNamePromptModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== initialValue.trim();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    onSubmit(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-fg">
          {label}
          <input
            aria-label={label}
            autoFocus
            value={value}
            placeholder={placeholder ?? t.skills.namePlaceholder}
            onChange={(event) => setValue(event.target.value)}
            disabled={isSubmitting}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-bg px-3 outline-none focus:border-accent disabled:opacity-50"
          />
        </label>
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
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
