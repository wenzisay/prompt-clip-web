/**
 * 删除确认对话框组件
 */

import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { Modal } from '@/components/common';
import { PromptService } from '@/services/promptService';

interface DeleteConfirmProps {
  /** 要删除的 Prompt ID */
  promptId: string;
  /** Prompt 标题 */
  promptTitle: string;
}

export function DeleteConfirm({ promptId, promptTitle }: DeleteConfirmProps) {
  const { modalType, closeModal } = useUIStore();
  const { deletePrompt, prompts } = usePromptStore();
  const { directoryHandle } = useFileStore();

  const isOpen = modalType === 'delete';

  const handleDelete = async () => {
    try {
      const prompt = prompts.find((p) => p.id === promptId);
      if (!prompt || !directoryHandle) return;

      await PromptService.deletePrompt(directoryHandle, prompt);
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
      title="确认删除"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <p className="text-fg">
          确定要删除 Prompt <strong>{promptTitle}</strong> 吗？
        </p>
        <p className="text-sm text-muted">
          此操作会将文件移动到 .trash 目录，并从当前列表中移除。
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm font-medium text-fg rounded-lg hover:bg-surface-dim transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:opacity-90 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </Modal>
  );
}
