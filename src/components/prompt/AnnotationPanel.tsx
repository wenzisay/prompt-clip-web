import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { messages, useTranslation, type Locale } from '@/i18n';
import { CONFIG } from '@/constants/config';
import { fileRepository, type FileRepository } from '@/services/fileRepository';
import { AnnotationService } from '@/services/annotationService';
import { useAnnotationStore } from '@/stores/annotationStore';
import type { PromptAnnotation, AnnotationAttachment, UpdateAnnotationInput } from '@/types/annotation';
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

  async function handleUpdate(input: UpdateAnnotationInput) {
    if (!workspace) return;

    try {
      await updateAnnotation(repository, workspace, promptId, input);
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
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
        aria-label={t.app.annotationText}
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
  onUpdate: (input: UpdateAnnotationInput) => Promise<void> | void;
  editingAnnotationId?: string | null;
}

export function AnnotationList({
  annotations,
  isSaving,
  locale = 'zh-CN',
  repository,
  workspace,
  onDelete,
  onUpdate,
  editingAnnotationId = null,
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
          initialIsEditing={annotation.id === editingAnnotationId}
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
  onUpdate: (input: UpdateAnnotationInput) => Promise<void> | void;
  initialIsEditing?: boolean;
}

function AnnotationItem({
  annotation,
  isSaving,
  locale,
  repository,
  workspace,
  onDelete,
  onUpdate,
  initialIsEditing = false,
}: AnnotationItemProps) {
  const t = messages[locale];
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [draft, setDraft] = useState(annotation.text);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const createdAt = formatDateTime(new Date(annotation.createdAt));
  const updatedAt = formatDateTime(new Date(annotation.updatedAt));
  const didEdit = annotation.updatedAt !== annotation.createdAt;
  const currentImage = shouldRemoveImage ? null : annotation.attachments[0] ?? null;
  const selectedImageName = selectedImage?.name ?? currentImage?.name ?? null;

  // Check if content is too long on mount and when editing changes
  useEffect(() => {
    if (!isEditing && contentRef.current) {
      // Check if content exceeds max height (approx 8 lines of text at 1.5rem leading)
      const maxHeight = 8 * 24; // 8 lines * 24px per line (1.5rem * 16px base)
      setIsOverflowing(contentRef.current.scrollHeight > maxHeight);
    }
  }, [annotation.text, isEditing]);

  useEffect(() => {
    if (!isEditing) return;

    setDraft(annotation.text);
    setSelectedImage(null);
    setShouldRemoveImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [annotation, isEditing]);

  function handleStartEdit() {
    setDraft(annotation.text);
    setSelectedImage(null);
    setShouldRemoveImage(false);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setDraft(annotation.text);
    setSelectedImage(null);
    setShouldRemoveImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    if (file.size > CONFIG.FILE_SYSTEM.MAX_ANNOTATION_IMAGE_BYTES) {
      event.target.value = '';
      return;
    }

    setSelectedImage(file);
    setShouldRemoveImage(false);
  }

  function handleRemoveImage() {
    setSelectedImage(null);
    setShouldRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    await onUpdate({
      id: annotation.id,
      text: trimmedDraft,
      ...(selectedImage && { image: await fileToImageInput(selectedImage) }),
      ...(shouldRemoveImage && { removeImage: true }),
    });
    setIsEditing(false);
  }

  return (
    <article className="rounded-md border border-border bg-surface px-3 py-3">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t.app.annotationText}
            className="min-h-20 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm leading-6 text-fg outline-none focus:border-accent"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm font-medium text-fg transition-colors hover:bg-surface-dim">
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
              {selectedImageName && (
                <span className="inline-flex items-center gap-2 rounded-md bg-bg px-2 py-1 text-xs text-muted">
                  {t.app.annotationImageSelected(selectedImageName)}
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
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
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
        </div>
      ) : (
        <div>
          <p
            ref={contentRef}
            className={`whitespace-pre-wrap text-sm leading-6 text-fg ${
              !isExpanded && isOverflowing ? 'max-h-32 overflow-hidden' : ''
            }`}
          >
            {annotation.text}
          </p>
          {isOverflowing && !isEditing && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              {isExpanded ? (
                <>
                  <span className="material-symbols-outlined text-sm">expand_less</span>
                  {t.app.collapseAnnotation}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                  {t.app.expandAnnotation}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {!isEditing && annotation.attachments.map((attachment) => (
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
          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-dim hover:text-fg"
              aria-label={t.app.editAnnotation}
              title={t.app.editAnnotation}
            >
              <span className="material-symbols-outlined text-base">edit</span>
              {t.app.edit}
            </button>
          )}
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="block w-full cursor-zoom-in bg-black/5"
          aria-label={t.app.openAnnotationImage}
          title={t.app.openAnnotationImage}
        >
          <img
            src={imageUrl}
            alt={t.app.annotationImageAlt(attachment.name)}
            className="max-h-72 w-full object-contain"
          />
        </button>
      )}
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
        <span className="material-symbols-outlined text-base">image</span>
        {attachment.name}
      </div>
      {imageUrl && isPreviewOpen && (
        <AnnotationImagePreview
          imageUrl={imageUrl}
          imageName={attachment.name}
          locale={locale}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}

interface AnnotationImagePreviewProps {
  imageUrl: string;
  imageName: string;
  locale?: Locale;
  onClose: () => void;
}

export function AnnotationImagePreview({
  imageUrl,
  imageName,
  locale = 'zh-CN',
  onClose,
}: AnnotationImagePreviewProps) {
  const t = messages[locale];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          aria-label={t.app.closeAnnotationImage}
          title={t.app.closeAnnotationImage}
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        <img
          src={imageUrl}
          alt={t.app.annotationImageAlt(imageName)}
          className="max-h-[calc(100vh-2rem)] max-w-full rounded-md object-contain shadow-2xl"
        />
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
