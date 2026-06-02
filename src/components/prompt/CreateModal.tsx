/**
 * Prompt 创建/编辑抽屉组件
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { SideDrawer } from '@/components/common';
import { TagSelect } from '@/components/tag';
import { type MarkdownViewMode } from './MarkdownModeToggle';
import { PromptMarkdownEditorField } from './PromptMarkdownEditorField';
import { PromptService } from '@/services/promptService';
import { fileRepository } from '@/services/fileRepository';
import { validatePromptTitleForFilename } from '@/utils/id';
import { formatSaveErrorMessage } from '@/utils/errorMessage';

interface CreateModalProps {
  /** 编辑模式下的 Prompt ID */
  editingPromptId?: string | null;
}

export function CreateModal({ editingPromptId }: CreateModalProps) {
  const { locale, t } = useTranslation();
  const { modalType, closeModal, setSelectedPrompt } = useUIStore();
  const { addPrompt, updatePrompt, deletePrompt, prompts, filter } = usePromptStore();
  const { workspace } = useFileStore();

  const isOpen = modalType === 'create' || modalType === 'edit';

  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<MarkdownViewMode>('text');

  // 编辑模式：加载现有数据
  useEffect(() => {
    if (editingPromptId && modalType === 'edit') {
      const prompt = prompts.find((p) => p.id === editingPromptId);
      if (prompt) {
        setTitle(prompt.title);
        setContent(prompt.content);
        setTags(prompt.tags);
        if (!prompt.isContentLoaded && workspace) {
          let cancelled = false;
          PromptService.ensureContent(fileRepository, workspace, prompt)
            .then((full) => {
              if (cancelled) return;
              setContent(full.content);
              updatePrompt(full);
            })
            .catch((error: unknown) => {
              if (cancelled) return;
              console.error('Failed to load prompt content for edit:', error);
            });
          return () => {
            cancelled = true;
          };
        }
      }
    } else {
      // 新建模式：重置表单，自动带入当前筛选的标签
      setTitle('');
      setContent('');
      setTags(filter.tag ? [filter.tag] : []);
    }
    setEditorMode('text');
    setError(null);
    return undefined;
  }, [editingPromptId, modalType, isOpen, prompts, filter.tag, workspace, updatePrompt]);

  // 关闭模态框
  const handleClose = () => {
    if (!isSaving) {
      closeModal();
    }
  };

  // 保存
  const handleSave = async () => {
    setError(null);

    // 验证
    if (!title.trim()) {
      setError(t.app.enterTitle);
      return;
    }

    const titleError = validatePromptTitleForFilename(title);
    if (titleError) {
      setError(titleError);
      return;
    }

    if (!content.trim()) {
      setError(t.app.enterContent);
      return;
    }

    if (!workspace) {
      setError(t.app.noWorkspace);
      return;
    }

    setIsSaving(true);

    try {
      if (editingPromptId && modalType === 'edit') {
        // 编辑模式
        const existing = prompts.find((p) => p.id === editingPromptId);
        if (existing && workspace) {
          const updated = await PromptService.updatePrompt(
            fileRepository,
            workspace,
            existing,
            {
              id: existing.id,
              title: title.trim(),
              content: content.trim(),
              tags,
            }
          );

          if (updated.id !== existing.id) {
            deletePrompt(existing.id);
            addPrompt(updated);
            setSelectedPrompt(updated.id);
          } else {
            updatePrompt(updated);
          }
        }
      } else {
        // 新建模式
        const newPrompt = await PromptService.createPrompt(fileRepository, workspace, {
          title: title.trim(),
          content: content.trim(),
          tags,
        });

        addPrompt(newPrompt);
      }

      closeModal();
    } catch (err) {
      setError(formatSaveErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={editingPromptId ? t.app.editPrompt : t.app.createPromptTitle}
      closeOnOverlayClick={!isSaving}
      closeLabel={t.app.close}
      resizeLabel={t.app.resizeDrawer}
      resizeTitle={t.app.dragResize}
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-fg rounded-lg hover:bg-surface-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">
                  refresh
                </span>
                {t.app.saving}
              </>
            ) : (
              editingPromptId ? t.app.save : t.app.create
            )}
          </button>
        </>
      }
      bodyClassName="flex flex-col"
    >
      <div className="flex min-h-full flex-1 flex-col gap-4">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* 标题 */}
        <div>
          <label htmlFor="prompt-title" className="block text-sm font-medium text-fg mb-1">
            {t.app.title} <span className="text-red-500">*</span>
          </label>
          <input
            id="prompt-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t.app.titlePlaceholder}
            maxLength={120}
            className="w-full px-3 py-2 bg-surface-container rounded-lg text-sm text-fg placeholder:text-muted border border-[var(--border-strong)] shadow-inner focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft transition-colors focus:outline-none"
            autoFocus
            disabled={isSaving}
          />
          <div className="mt-1 text-right text-xs text-muted">{title.trim().length}/120</div>
        </div>

        {/* 标签 */}
        <div>
          <label className="block text-sm font-medium text-fg mb-1">
            {t.app.tags}
          </label>
          <TagSelect selectedTags={tags} onChange={setTags} />
        </div>

        <PromptMarkdownEditorField
          value={content}
          onChange={(value) => {
            setContent(value);
            if (error) setError(null);
          }}
          mode={editorMode}
          onModeChange={setEditorMode}
          disabled={isSaving}
          locale={locale}
        />
      </div>
    </SideDrawer>
  );
}
