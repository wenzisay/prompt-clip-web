import { useEffect, useRef, useState } from 'react';
import { messages, useTranslation, type Locale } from '@/i18n';
import { CONFIG } from '@/constants/config';
import { fileRepository, type FileRepository } from '@/services/fileRepository';
import { AnnotationService } from '@/services/annotationService';
import { useAnnotationStore } from '@/stores/annotationStore';
import type { PromptAnnotation, AnnotationAttachment } from '@/types/annotation';
import type { WorkspaceRef } from '@/types/file';
import { formatDateTime } from '@/utils/date';

interface AnnotationPanelProps {
  promptId: string;
  workspace: WorkspaceRef | null;
  repository?: FileRepository;
}

export function AnnotationPanel({
  promptId,
  workspace,
  repository = fileRepository,
}: AnnotationPanelProps) {
  const { locale, t } = useTranslation();
  const {
    annotations,
    isLoading,
    isSaving,
    error,
    loadAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotationStore();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;

    loadAnnotations(repository, workspace, promptId).catch((loadError) => {
      console.error(t.app.annotationLoadFailed, loadError);
    });
  }, [loadAnnotations, promptId, repository, t.app.annotationLoadFailed, workspace]);

  async function handleCreate(text: string, image: File | null) {
    if (!workspace) return;

    setLocalError(null);
    try {
      await createAnnotation(repository, workspace, promptId, {
        text,
        ...(image && { image: await fileToImageInput(image) }),
      });
    } catch (createError) {
      console.error(t.app.annotationSaveFailed, createError);
    }
  }

  async function handleUpdate(id: string, text: string) {
    if (!workspace) return;

    try {
      await updateAnnotation(repository, workspace, promptId, { id, text });
    } catch (updateError) {
      console.error(t.app.annotationSaveFailed, updateError);
    }
  }

  async function handleDelete(id: string) {
    if (!workspace || !window.confirm(t.app.annotationDeleteConfirm)) return;

    try {
      await deleteAnnotation(repository, workspace, promptId, id);
    } catch (deleteError) {
      console.error(t.app.annotationSaveFailed, deleteError);
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-fg">{t.app.annotations}</h2>
        {isLoading && <span className="text-xs text-muted">{t.app.loading}</span>}
      </div>

      <AnnotationComposer
        isSaving={isSaving}
        locale={locale}
        onError={setLocalError}
        onSubmit={handleCreate}
      />

      {(localError || error) && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError || error}
        </p>
      )}

      <AnnotationList
        annotations={annotations}
        isSaving={isSaving}
        locale={locale}
        repository={repository}
        workspace={workspace}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </section>
  );
}

interface AnnotationComposerProps {
  isSaving: boolean;
  locale?: Locale;
  onError: (message: string | null) => void;
  onSubmit: (text: string, image: File | null) => Promise<void>;
}

export function AnnotationComposer({
  isSaving,
  locale = 'zh-CN',
  onError,
  onSubmit,
}: AnnotationComposerProps) {
  const t = messages[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onError(t.app.annotationImageOnly);
      event.target.value = '';
      return;
    }

    if (file.size > CONFIG.FILE_SYSTEM.MAX_ANNOTATION_IMAGE_BYTES) {
      onError(t.app.annotationImageTooLarge);
      event.target.value = '';
      return;
    }

    onError(null);
    setImage(file);
  }

  function handleRemoveImage() {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit() {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    await onSubmit(trimmedText, image);
    setText('');
    handleRemoveImage();
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-h-24 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-6 text-fg outline-none transition-colors placeholder:text-muted focus:border-accent"
        placeholder={t.app.annotationPlaceholder}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface-dim">
            <span className="material-symbols-outlined text-lg">image</span>
            {t.app.addImage}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
            />
          </label>
          {image && (
            <span className="inline-flex items-center gap-2 rounded-md bg-surface px-2 py-1 text-xs text-muted">
              {t.app.annotationImageSelected(image.name)}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-muted transition-colors hover:text-fg"
                aria-label={t.app.removeImage}
                title={t.app.removeImage}
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || text.trim().length === 0}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">add_comment</span>
          {isSaving ? t.app.savingAnnotation : t.app.saveAnnotation}
        </button>
      </div>
    </div>
  );
}

interface AnnotationListProps {
  annotations: PromptAnnotation[];
  isSaving: boolean;
  locale?: Locale;
  repository?: FileRepository;
  workspace?: WorkspaceRef | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => Promise<void> | void;
}

export function AnnotationList({
  annotations,
  isSaving,
  locale = 'zh-CN',
  repository,
  workspace,
  onDelete,
  onUpdate,
}: AnnotationListProps) {
  const t = messages[locale];

  if (annotations.length === 0) {
    return (
      <p className="mt-5 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted">
        {t.app.noAnnotations}
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {annotations.map((annotation) => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          isSaving={isSaving}
          locale={locale}
          repository={repository}
          workspace={workspace}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}

interface AnnotationItemProps {
  annotation: PromptAnnotation;
  isSaving: boolean;
  locale: Locale;
  repository?: FileRepository;
  workspace?: WorkspaceRef | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => Promise<void> | void;
}

function AnnotationItem({
  annotation,
  isSaving,
  locale,
  repository,
  workspace,
  onDelete,
  onUpdate,
}: AnnotationItemProps) {
  const t = messages[locale];
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.text);
  const createdAt = formatDateTime(new Date(annotation.createdAt));
  const updatedAt = formatDateTime(new Date(annotation.updatedAt));
  const didEdit = annotation.updatedAt !== annotation.createdAt;

  async function handleSave() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    await onUpdate(annotation.id, trimmedDraft);
    setIsEditing(false);
  }

  return (
    <article className="rounded-md border border-border bg-surface px-3 py-3">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-20 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-6 text-fg outline-none focus:border-accent"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface-dim"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || draft.trim().length === 0}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {t.app.save}
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6 text-fg">{annotation.text}</p>
      )}

      {annotation.attachments.map((attachment) => (
        <AnnotationAttachmentView
          key={attachment.id}
          attachment={attachment}
          locale={locale}
          repository={repository}
          workspace={workspace}
        />
      ))}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {didEdit ? t.app.annotationUpdatedAt(updatedAt) : t.app.annotationCreatedAt(createdAt)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-dim hover:text-fg"
            aria-label={t.app.editAnnotation}
            title={t.app.editAnnotation}
          >
            <span className="material-symbols-outlined text-base">edit</span>
            {t.app.edit}
          </button>
          <button
            type="button"
            onClick={() => onDelete(annotation.id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-red-50 hover:text-red-600"
            aria-label={t.app.deleteAnnotation}
            title={t.app.deleteAnnotation}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            {t.app.delete}
          </button>
        </div>
      </div>
    </article>
  );
}

interface AnnotationAttachmentViewProps {
  attachment: AnnotationAttachment;
  locale: Locale;
  repository?: FileRepository;
  workspace?: WorkspaceRef | null;
}

function AnnotationAttachmentView({
  attachment,
  locale,
  repository,
  workspace,
}: AnnotationAttachmentViewProps) {
  const t = messages[locale];
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!repository || !workspace || typeof URL === 'undefined') return;

    let objectUrl: string | null = null;
    let isActive = true;

    AnnotationService.readAttachment(repository, workspace, attachment)
      .then((data) => {
        if (!isActive) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: attachment.mimeType }));
        setImageUrl(objectUrl);
      })
      .catch((error) => {
        console.error('Failed to read annotation attachment:', error);
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment, repository, workspace]);

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border bg-bg">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={t.app.annotationImageAlt(attachment.name)}
          className="max-h-72 w-full object-contain"
        />
      )}
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <span className="material-symbols-outlined text-base">image</span>
        {attachment.name}
      </div>
    </div>
  );
}

async function fileToImageInput(file: File) {
  return {
    data: new Uint8Array(await file.arrayBuffer()),
    name: file.name,
    mimeType: file.type,
  };
}
