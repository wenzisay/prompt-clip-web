/**
 * 删除确认对话框组件
 */

import { usePromptStore } from '@/stores/promptStore';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { Modal } from '@/components/common';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';

interface DeleteConfirmProps {
  /** 要删除的 Prompt ID */
  promptId: string;
  /** Prompt 标题 */
  promptTitle: string;
}

export function DeleteConfirm({ promptId, promptTitle }: DeleteConfirmProps) {
  const { t } = useTranslation();
  const { modalType, closeModal } = useUIStore();
  const { deletePrompt, prompts } = usePromptStore();
  const { workspace } = useFileStore();

  const isOpen = modalType === 'delete';

  const handleDelete = async () => {
    try {
      const prompt = prompts.find((p) => p.id === promptId);
      if (!prompt || !workspace) return;

      await PromptService.deletePrompt(fileRepository, workspace, prompt);
      deletePrompt(promptId);
      closeModal();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={t.app.confirmDelete}
      maxWidth="sm"
      closeLabel={t.app.close}
    >
      <div className="space-y-4">
        <p className="text-fg">
          {t.app.deletePromptConfirm(promptTitle)}
        </p>
        <p className="text-sm text-muted">
          {t.app.deletePromptNote}
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-fg rounded-lg hover:bg-surface-dim transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:opacity-90 transition-colors"
          >
            {t.app.delete}
          </button>
        </div>
      </div>
    </Modal>
  );
}
