/**
 * Prompt 批注状态管理
 */

import { create } from 'zustand';
import { AnnotationService } from '@/services/annotationService';
import type { FileRepository } from '@/services/fileRepository';
import type {
  CreateAnnotationInput,
  PromptAnnotation,
  UpdateAnnotationInput,
} from '@/types/annotation';
import type { WorkspaceRef } from '@/types/file';

interface AnnotationState {
  /** 当前批注关联的 Prompt ID */
  promptId: string | null;
  /** 当前 Prompt 的批注列表 */
  annotations: PromptAnnotation[];
  /** 是否正在加载批注 */
  isLoading: boolean;
  /** 是否正在保存批注 */
  isSaving: boolean;
  /** 当前错误 */
  error: string | null;

  /** 加载指定 Prompt 的批注 */
  loadAnnotations: (
    repository: FileRepository,
    workspace: WorkspaceRef,
    promptId: string
  ) => Promise<void>;
  /** 新增批注 */
  createAnnotation: (
    repository: FileRepository,
    workspace: WorkspaceRef,
    promptId: string,
    input: CreateAnnotationInput
  ) => Promise<void>;
  /** 更新批注 */
  updateAnnotation: (
    repository: FileRepository,
    workspace: WorkspaceRef,
    promptId: string,
    input: UpdateAnnotationInput
  ) => Promise<void>;
  /** 删除批注 */
  deleteAnnotation: (
    repository: FileRepository,
    workspace: WorkspaceRef,
    promptId: string,
    annotationId: string
  ) => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
  /** 重置状态 */
  reset: () => void;
}

function getAnnotationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '批注操作失败';
}

export const useAnnotationStore = create<AnnotationState>()((set) => ({
  promptId: null,
  annotations: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadAnnotations: async (repository, workspace, promptId) => {
    set({ isLoading: true, error: null });
    try {
      const file = await AnnotationService.loadAnnotations(repository, workspace, promptId);
      set({
        promptId,
        annotations: file.annotations,
        isLoading: false,
      });
    } catch (error) {
      set({ error: getAnnotationErrorMessage(error), isLoading: false });
      throw error;
    }
  },

  createAnnotation: async (repository, workspace, promptId, input) => {
    set({ isSaving: true, error: null });
    try {
      const file = await AnnotationService.createAnnotation(repository, workspace, promptId, input);
      set({
        promptId,
        annotations: file.annotations,
        isSaving: false,
      });
    } catch (error) {
      set({ error: getAnnotationErrorMessage(error), isSaving: false });
      throw error;
    }
  },

  updateAnnotation: async (repository, workspace, promptId, input) => {
    set({ isSaving: true, error: null });
    try {
      const file = await AnnotationService.updateAnnotation(repository, workspace, promptId, input);
      set({
        promptId,
        annotations: file.annotations,
        isSaving: false,
      });
    } catch (error) {
      set({ error: getAnnotationErrorMessage(error), isSaving: false });
      throw error;
    }
  },

  deleteAnnotation: async (repository, workspace, promptId, annotationId) => {
    set({ isSaving: true, error: null });
    try {
      const file = await AnnotationService.deleteAnnotation(
        repository,
        workspace,
        promptId,
        annotationId
      );
      set({
        promptId,
        annotations: file.annotations,
        isSaving: false,
      });
    } catch (error) {
      set({ error: getAnnotationErrorMessage(error), isSaving: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    promptId: null,
    annotations: [],
    isLoading: false,
    isSaving: false,
    error: null,
  }),
}));
