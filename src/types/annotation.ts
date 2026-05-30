/**
 * Prompt 批注相关类型
 */

export interface PromptAnnotationFile {
  promptId: string;
  version: 1;
  annotations: PromptAnnotation[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptAnnotation {
  id: string;
  text: string;
  attachments: AnnotationAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationAttachment {
  id: string;
  type: 'image';
  name: string;
  mimeType: string;
  path: string;
  size: number;
  createdAt: string;
}

export interface AnnotationImageInput {
  data: Uint8Array;
  name: string;
  mimeType: string;
}

export interface CreateAnnotationInput {
  text: string;
  image?: AnnotationImageInput;
}

export interface UpdateAnnotationInput {
  id: string;
  text: string;
}
