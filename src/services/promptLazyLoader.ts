/**
 * 后台分批补全 Prompt 正文。
 *
 * - 使用 `requestIdleCallback`（带 setTimeout fallback）在浏览器空闲时拉取全文
 * - 每批并发调用 `PromptService.ensureContent` + `SearchService.addContentToIndex` + `promptStore.patchPromptContent`
 * - 通过 `cancel()` 立即停止后续批次；进行中批次的写回靠 generation 标识丢弃
 * - workspace 切换时旧 generation 全部废弃
 */

import type { Prompt } from '@/types/prompt';
import type { FileRepository } from './fileRepository';
import type { WorkspaceRef } from '@/types/file';
import { PromptService } from './promptService';
import { SearchService } from './searchService';
import { usePromptStore } from '@/stores/promptStore';

export interface PromptLazyLoaderOptions {
  repository: FileRepository;
  workspace: WorkspaceRef;
  batchSize?: number;
  /** 用于测试注入 idle 调度，默认用全局 requestIdleCallback / setTimeout */
  requestIdle?: (cb: IdleRequestCallback) => number;
  /** 用于测试注入 cancelIdle；默认使用全局 */
  cancelIdle?: (handle: number) => void;
}

interface RunningState {
  generation: number;
  /** 持有每个 schedule handle 用于 cancel */
  handles: Set<number>;
  cancelled: boolean;
  cancelIdle: CancelIdleFn;
}

let currentState: RunningState | null = null;
let nextGeneration = 0;

const DEFAULT_BATCH_SIZE = 50;

type RequestIdleFn = (cb: IdleRequestCallback) => number;
type CancelIdleFn = (handle: number) => void;

function getDefaultIdleScheduler(): {
  requestIdle: RequestIdleFn;
  cancelIdle: CancelIdleFn;
} {
  if (typeof window !== 'undefined' && typeof (window as { requestIdleCallback?: RequestIdleFn }).requestIdleCallback === 'function') {
    const w = window as unknown as {
      requestIdleCallback: RequestIdleFn;
      cancelIdleCallback: CancelIdleFn;
    };
    return {
      requestIdle: (cb) => w.requestIdleCallback(cb),
      cancelIdle: (handle) => w.cancelIdleCallback(handle),
    };
  }
  return {
    requestIdle: (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0) as unknown as number,
    cancelIdle: (handle) => clearTimeout(handle),
  };
}

export function startLazyContentLoad(
  prompts: Prompt[],
  options: PromptLazyLoaderOptions
): { cancel: () => void } {
  cancelLazyContentLoad();

  const idle = {
    requestIdle: options.requestIdle ?? getDefaultIdleScheduler().requestIdle,
    cancelIdle: options.cancelIdle ?? getDefaultIdleScheduler().cancelIdle,
  };
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const state: RunningState = {
    generation: ++nextGeneration,
    handles: new Set<number>(),
    cancelled: false,
    cancelIdle: idle.cancelIdle,
  };
  currentState = state;

  const targets = prompts.filter((p) => !p.isContentLoaded);
  if (targets.length === 0) {
    return {
      cancel: () => {
        state.cancelled = true;
      },
    };
  }

  let cursor = 0;

  const scheduleNext = () => {
    if (state.cancelled) {
      return;
    }
    if (cursor >= targets.length) {
      return;
    }
    const handle = idle.requestIdle(() => {
      state.handles.delete(handle);
      if (state.cancelled) {
        return;
      }
      const batch = targets.slice(cursor, cursor + batchSize);
      cursor += batchSize;
      void processBatch(batch, state.generation, options.repository, options.workspace);
      scheduleNext();
    });
    state.handles.add(handle);
  };

  scheduleNext();

  return {
    cancel: () => {
      state.cancelled = true;
      for (const handle of state.handles) {
        idle.cancelIdle(handle);
      }
      state.handles.clear();
    },
  };
}

export function cancelLazyContentLoad(): void {
  if (!currentState) {
    return;
  }
  currentState.cancelled = true;
  for (const handle of currentState.handles) {
    try {
      currentState.cancelIdle(handle);
    } catch {
      // 忽略 cancelIdle 错误
    }
  }
  currentState.handles.clear();
  currentState = null;
}

async function processBatch(
  batch: Prompt[],
  generation: number,
  repository: FileRepository,
  workspace: WorkspaceRef
): Promise<void> {
  await Promise.all(
    batch.map(async (prompt) => {
      try {
        const full = await PromptService.ensureContent(repository, workspace, prompt);
        if (currentState?.generation !== generation) {
          return;
        }
        usePromptStore.getState().patchPromptContent(full.id, full.content);
        SearchService.addContentToIndex(full.id, full.content);
      } catch (error) {
        console.error('Failed to lazy-load prompt content:', prompt.id, error);
      }
    })
  );
}
