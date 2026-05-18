import { tauriFileRepository } from './tauriFileRepository';
import { webFileRepository } from './webFileRepository';

export type { FileRepository } from './types';
export { createFakeFileRepository, createFakeWorkspace } from './fakeFileRepository';
export { tauriFileRepository } from './tauriFileRepository';
export { webFileRepository } from './webFileRepository';

export const fileRepository =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    ? tauriFileRepository
    : webFileRepository;
