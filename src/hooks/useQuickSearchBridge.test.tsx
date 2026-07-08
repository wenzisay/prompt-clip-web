import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuickSearchBridge } from './useQuickSearchBridge';
import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { QS_OPEN_DETAIL, QS_SEARCH, QS_SEARCH_RESULT } from '@/quickSearch/quickSearchRpc';
import type { Prompt } from '@/types/prompt';

// 按事件名捕获 listen 注册的 handler，便于测试手动触发（绕过真实 Tauri 事件系统）。
// invoke 也替换为 mock，验证 bridge 调用了正确的命令而非直接操作窗口。
const { listeners, emitMock, invokeMock } = vi.hoisted(() => ({
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
  emitMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
    listeners.set(name, handler);
    return () => {
      listeners.delete(name);
    };
  }),
  emit: emitMock,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

function HookHost() {
  useQuickSearchBridge();
  return null;
}

function makePrompt(overrides: Partial<Prompt>): Prompt {
  return {
    id: 'prompt-1',
    title: 'Prompt',
    content: '',
    preview: '',
    isContentLoaded: false,
    tags: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    copyCount: 0,
    pinned: false,
    filePath: 'prompt.md',
    ...overrides,
  };
}

describe('useQuickSearchBridge', () => {
  afterEach(() => {
    cleanup();
    emitMock.mockReset();
    invokeMock.mockReset();
    listeners.clear();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    useUIStore.getState().setSelectedPrompt(null);
    usePromptStore.getState().clearPrompts();
  });

  it('should return recently used prompts when search query is empty', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    usePromptStore.setState({
      prompts: [
        makePrompt({ id: 'old', title: 'Old copied', copyCount: 1 }),
        makePrompt({ id: 'new', title: 'New copied', copyCount: 3 }),
        makePrompt({ id: 'pinned', title: 'Pinned', pinned: true }),
        makePrompt({ id: 'unused', title: 'Unused' }),
      ],
    });

    render(<HookHost />);

    await waitFor(() => {
      expect(listeners.has(QS_SEARCH)).toBe(true);
    });

    const handler = listeners.get(QS_SEARCH);
    expect(handler).toBeTruthy();
    await handler!({ payload: { requestId: 7, query: '' } });

    expect(emitMock).toHaveBeenCalledWith(QS_SEARCH_RESULT, {
      requestId: 7,
      results: [
        expect.objectContaining({ id: 'pinned', title: 'Pinned' }),
        expect.objectContaining({ id: 'new', title: 'New copied' }),
        expect.objectContaining({ id: 'old', title: 'Old copied' }),
      ],
    });
  });

  it('should select the prompt and focus the main window via command on open-detail', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue(undefined);

    render(<HookHost />);

    await waitFor(() => {
      expect(listeners.has(QS_OPEN_DETAIL)).toBe(true);
    });

    const handler = listeners.get(QS_OPEN_DETAIL);
    expect(handler).toBeTruthy();
    await handler!({ payload: 'prompt-123' });

    // 详情状态已写入（这是修复前就已经生效的部分）
    expect(useUIStore.getState().selectedPromptId).toBe('prompt-123');
    // 关键修复：通过后端命令激活整个应用并把主窗口拉到前台，
    // 而非仅 window.show/setFocus（无法唤醒未在前台的应用）
    expect(invokeMock).toHaveBeenCalledWith('focus_main_window');
  });
});
