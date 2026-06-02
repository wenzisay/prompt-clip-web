import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { cancelLazyContentLoad, startLazyContentLoad } from './promptLazyLoader';
import { usePromptStore } from '@/stores/promptStore';

function createHeadOnlyPrompt(id: string): Prompt {
  return {
    id,
    title: id,
    content: '',
    preview: 'preview',
    isContentLoaded: false,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: `${id}.md`,
  };
}

function makeFileMap(ids: string[]): Record<string, string> {
  return Object.fromEntries(
    ids.map((id) => [
      `${id}.md`,
      ['---', `title: ${id}`, '---', '', `body of ${id}`].join('\n'),
    ])
  );
}

describe('promptLazyLoader', () => {
  beforeEach(() => {
    cancelLazyContentLoad();
  });
  afterEach(() => {
    cancelLazyContentLoad();
    usePromptStore.getState().clearPrompts();
  });

  it('does nothing when all prompts already have content loaded', () => {
    const repository = createFakeFileRepository();
    const idle = vi.fn(() => 0);
    const cancel = vi.fn();
    const handle = startLazyContentLoad(
      [{ ...createHeadOnlyPrompt('a'), isContentLoaded: true, content: 'x' }],
      { repository, workspace: createFakeWorkspace(), requestIdle: idle, cancelIdle: cancel }
    );
    expect(idle).not.toHaveBeenCalled();
    handle.cancel();
  });

  it('schedules idle callbacks in batches', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `p${i}`);
    const repository = createFakeFileRepository({ files: makeFileMap(ids) });
    const idleCallbacks: Array<() => void> = [];
    let counter = 0;
    const requestIdle = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(() => cb({ didTimeout: false, timeRemaining: () => 50 }));
      return ++counter;
    });
    const cancelIdle = vi.fn();

    const handle = startLazyContentLoad(
      ids.map(createHeadOnlyPrompt),
      { repository, workspace: createFakeWorkspace(), batchSize: 50, requestIdle, cancelIdle }
    );

    while (idleCallbacks.length > 0) {
      const next = idleCallbacks.shift();
      if (!next) break;
      next();
      await Promise.resolve();
      await Promise.resolve();
    }

    expect(requestIdle.mock.calls.length).toBe(3);
    expect(cancelIdle).not.toHaveBeenCalled();
    handle.cancel();
  });

  it('cancel() stops scheduling further batches', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const repository = createFakeFileRepository({ files: makeFileMap(ids) });
    const idleCallbacks: Array<() => void> = [];
    let counter = 0;
    const requestIdle = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(() => cb({ didTimeout: false, timeRemaining: () => 50 }));
      return ++counter;
    });
    const cancelIdle = vi.fn();

    const handle = startLazyContentLoad(
      ids.map(createHeadOnlyPrompt),
      { repository, workspace: createFakeWorkspace(), batchSize: 10, requestIdle, cancelIdle }
    );

    idleCallbacks.shift()?.();
    await Promise.resolve();
    await Promise.resolve();

    handle.cancel();
    const remaining = idleCallbacks.length;
    while (idleCallbacks.length > 0) {
      idleCallbacks.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }
    expect(cancelIdle).toHaveBeenCalled();
    expect(remaining).toBeGreaterThan(0);
  });

  it('starting a new load cancels the previous one', () => {
    const repository = createFakeFileRepository();
    let counter = 0;
    const requestIdle = vi.fn(() => ++counter);
    const cancelIdle = vi.fn();

    startLazyContentLoad(
      [createHeadOnlyPrompt('a')],
      { repository, workspace: createFakeWorkspace(), requestIdle, cancelIdle }
    );
    startLazyContentLoad(
      [createHeadOnlyPrompt('b')],
      { repository, workspace: createFakeWorkspace(), requestIdle, cancelIdle }
    );

    expect(cancelIdle).toHaveBeenCalled();
  });

  it('ignores stale batch results after a new load starts', async () => {
    const id = 'shared';
    const oldPrompt = createHeadOnlyPrompt(id);
    const newPrompt = createHeadOnlyPrompt(id);
    usePromptStore.setState({ prompts: [newPrompt], filteredPrompts: [newPrompt] });
    let resolveOldRead: ((value: string) => void) | undefined;
    const oldRepository = {
      ...createFakeFileRepository({ files: makeFileMap([id]) }),
      readText: vi.fn(
        () => new Promise<string>((resolve) => {
          resolveOldRead = resolve;
        })
      ),
    };
    const newRepository = createFakeFileRepository({ files: makeFileMap(['new']) });
    const idleCallbacks: Array<() => void> = [];
    let counter = 0;
    const requestIdle = vi.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(() => cb({ didTimeout: false, timeRemaining: () => 50 }));
      return ++counter;
    });

    startLazyContentLoad(
      [oldPrompt],
      { repository: oldRepository, workspace: createFakeWorkspace(), requestIdle, cancelIdle: vi.fn() }
    );
    idleCallbacks.shift()?.();
    await Promise.resolve();
    startLazyContentLoad(
      [createHeadOnlyPrompt('new')],
      { repository: newRepository, workspace: createFakeWorkspace(), requestIdle, cancelIdle: vi.fn() }
    );
    resolveOldRead?.(['---', `title: ${id}`, '---', '', 'old body'].join('\n'));
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = usePromptStore.getState().prompts.find((prompt) => prompt.id === id);
    expect(stored).toMatchObject({
      content: '',
      isContentLoaded: false,
    });
  });
});
