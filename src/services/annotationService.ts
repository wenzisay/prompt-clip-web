/**
 * Prompt 批注服务
 */

import { CONFIG } from '@/constants/config';
import type {
  AnnotationAttachment,
  AnnotationImageInput,
  CreateAnnotationInput,
  PromptAnnotation,
  PromptAnnotationFile,
  UpdateAnnotationInput,
} from '@/types/annotation';
import type { WorkspaceRef } from '@/types/file';
import { generateShortId } from '@/utils/id';
import { joinPath, sanitizeFilename } from '@/utils/path';
import type { FileRepository } from './fileRepository';

const ANNOTATION_VERSION = 1;

/**
 * 读取指定 Prompt 的批注文件。
 */
export async function loadAnnotations(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string
): Promise<PromptAnnotationFile> {
  const path = annotationPath(promptId);

  try {
    return normalizeAnnotationFile(JSON.parse(await repository.readText(workspace, path)), promptId);
  } catch (error) {
    if (isMissingFileError(error)) {
      return createEmptyAnnotationFile(promptId, new Date());
    }
    throw error;
  }
}

/**
 * 新增 Prompt 批注。
 */
export async function createAnnotation(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  input: CreateAnnotationInput
): Promise<PromptAnnotationFile> {
  const text = normalizeAnnotationText(input.text);
  const now = new Date();
  const existing = await loadAnnotations(repository, workspace, promptId);
  const annotation: PromptAnnotation = {
    id: createId('annotation'),
    text,
    attachments: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (input.image) {
    annotation.attachments = [
      await writeImageAttachment(repository, workspace, promptId, annotation.id, input.image, now),
    ];
  }

  return saveAnnotationFile(repository, workspace, {
    ...existing,
    annotations: [annotation, ...existing.annotations],
    updatedAt: now.toISOString(),
  });
}

/**
 * 更新批注文本。
 */
export async function updateAnnotation(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  input: UpdateAnnotationInput
): Promise<PromptAnnotationFile> {
  const text = normalizeAnnotationText(input.text);
  const now = new Date();
  const existing = await loadAnnotations(repository, workspace, promptId);
  let didUpdate = false;
  const annotations: PromptAnnotation[] = [];

  for (const annotation of existing.annotations) {
    if (annotation.id !== input.id) {
      annotations.push(annotation);
      continue;
    }

    didUpdate = true;
    annotations.push({
      ...annotation,
      text,
      attachments: await updateAnnotationAttachments(
        repository,
        workspace,
        promptId,
        annotation,
        input,
        now
      ),
      updatedAt: now.toISOString(),
    });
  }

  if (!didUpdate) {
    throw new Error('批注不存在');
  }

  return saveAnnotationFile(repository, workspace, {
    ...existing,
    annotations,
    updatedAt: now.toISOString(),
  });
}

/**
 * 删除批注，并同步删除该批注下的附件目录。
 */
export async function deleteAnnotation(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  annotationId: string
): Promise<PromptAnnotationFile> {
  const now = new Date();
  const existing = await loadAnnotations(repository, workspace, promptId);
  const annotation = existing.annotations.find((item) => item.id === annotationId);

  if (!annotation) {
    throw new Error('批注不存在');
  }

  await removeIfExists(repository, workspace, annotationAssetDirectory(promptId, annotationId));

  return saveAnnotationFile(repository, workspace, {
    ...existing,
    annotations: existing.annotations.filter((item) => item.id !== annotationId),
    updatedAt: now.toISOString(),
  });
}

/**
 * 删除 Prompt 时，将对应批注 JSON 和附件目录移动到回收站。
 */
export async function movePromptAnnotationsToTrash(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  trashBase: string
): Promise<void> {
  const sourceAnnotationPath = annotationPath(promptId);
  const sourceAssetPath = promptAssetDirectory(promptId);

  if (await repository.exists(workspace, sourceAnnotationPath)) {
    await repository.mkdir(workspace, joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'annotations'));
    await repository.move(
      workspace,
      sourceAnnotationPath,
      joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'annotations', `${trashBase}.json`)
    );
  }

  if (await repository.exists(workspace, sourceAssetPath)) {
    await repository.mkdir(workspace, joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'assets'));
    await repository.move(
      workspace,
      sourceAssetPath,
      joinPath(CONFIG.FILE_SYSTEM.TRASH_DIR, 'assets', trashBase)
    );
  }
}

/**
 * 读取附件二进制内容。
 */
export async function readAttachment(
  repository: FileRepository,
  workspace: WorkspaceRef,
  attachment: AnnotationAttachment
): Promise<Uint8Array> {
  return repository.readBinary(workspace, attachment.path);
}

async function updateAnnotationAttachments(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  annotation: PromptAnnotation,
  input: UpdateAnnotationInput,
  now: Date
): Promise<AnnotationAttachment[]> {
  if (input.image) {
    await removeIfExists(repository, workspace, annotationAssetDirectory(promptId, annotation.id));
    return [
      await writeImageAttachment(repository, workspace, promptId, annotation.id, input.image, now),
    ];
  }

  if (input.removeImage) {
    await removeIfExists(repository, workspace, annotationAssetDirectory(promptId, annotation.id));
    return [];
  }

  return annotation.attachments;
}

async function saveAnnotationFile(
  repository: FileRepository,
  workspace: WorkspaceRef,
  file: PromptAnnotationFile
): Promise<PromptAnnotationFile> {
  await repository.mkdir(workspace, CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR);
  await repository.writeText(workspace, annotationPath(file.promptId), JSON.stringify(file, null, 2));
  return file;
}

async function writeImageAttachment(
  repository: FileRepository,
  workspace: WorkspaceRef,
  promptId: string,
  annotationId: string,
  image: AnnotationImageInput,
  now: Date
): Promise<AnnotationAttachment> {
  validateImage(image);

  const attachmentId = createId('attachment');
  const filename = `${attachmentId}${imageExtension(image.name, image.mimeType)}`;
  const path = joinPath(annotationAssetDirectory(promptId, annotationId), filename);

  await repository.mkdir(workspace, annotationAssetDirectory(promptId, annotationId));
  await repository.writeBinary(workspace, path, image.data);

  return {
    id: attachmentId,
    type: 'image',
    name: sanitizeFilename(image.name),
    mimeType: image.mimeType,
    path,
    size: image.data.byteLength,
    createdAt: now.toISOString(),
  };
}

function normalizeAnnotationFile(value: unknown, promptId: string): PromptAnnotationFile {
  if (!value || typeof value !== 'object') {
    throw new Error('批注文件格式无效');
  }

  const file = value as Partial<PromptAnnotationFile>;
  return {
    promptId,
    version: ANNOTATION_VERSION,
    annotations: Array.isArray(file.annotations) ? file.annotations : [],
    createdAt: typeof file.createdAt === 'string' ? file.createdAt : new Date().toISOString(),
    updatedAt: typeof file.updatedAt === 'string' ? file.updatedAt : new Date().toISOString(),
  };
}

function createEmptyAnnotationFile(promptId: string, now: Date): PromptAnnotationFile {
  return {
    promptId,
    version: ANNOTATION_VERSION,
    annotations: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function normalizeAnnotationText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('请输入批注内容');
  }
  return trimmed;
}

function validateImage(image: AnnotationImageInput): void {
  if (!image.mimeType.startsWith('image/')) {
    throw new Error('仅支持图片附件');
  }

  if (image.data.byteLength > CONFIG.FILE_SYSTEM.MAX_ANNOTATION_IMAGE_BYTES) {
    throw new Error('图片不能超过 5MB');
  }
}

function annotationPath(promptId: string): string {
  return joinPath(CONFIG.FILE_SYSTEM.ANNOTATIONS_DIR, `${promptId}.json`);
}

function promptAssetDirectory(promptId: string): string {
  return joinPath(CONFIG.FILE_SYSTEM.ANNOTATION_ASSETS_DIR, promptId);
}

function annotationAssetDirectory(promptId: string, annotationId: string): string {
  return joinPath(promptAssetDirectory(promptId), annotationId);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${generateShortId()}`;
}

function imageExtension(name: string, mimeType: string): string {
  const match = sanitizeFilename(name).match(/\.[A-Za-z0-9]+$/);
  if (match) {
    return match[0].toLowerCase();
  }

  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  return '.img';
}

async function removeIfExists(
  repository: FileRepository,
  workspace: WorkspaceRef,
  path: string
): Promise<void> {
  if (await repository.exists(workspace, path)) {
    await repository.remove(workspace, path);
  }
}

function isMissingFileError(error: unknown): boolean {
  if (!isErrorLike(error)) {
    return false;
  }

  return (
    error.name === 'NotFoundError' ||
    /不存在|not found|no such file|could not be found/i.test(error.message)
  );
}

function isErrorLike(error: unknown): error is { name: string; message: string } {
  if (error instanceof Error) {
    return true;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { name?: unknown }).name === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return true;
  }
  return false;
}

export const AnnotationService = {
  loadAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  movePromptAnnotationsToTrash,
  readAttachment,
} as const;
