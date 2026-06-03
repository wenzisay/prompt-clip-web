import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { PromptService } from '@/services/promptService';
import type { Prompt } from '@/types/prompt';
import { CreateModal } from './CreateModal';

function createPrompt(id: string, content: string): Prompt {
  return {
    id,
    title: `Prompt ${id}`,
    content,
    preview: content,
    isContentLoaded: true,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: `${id}.md`,
  };
}

describe('CreateModal editor mode', () => {
  beforeEach(() => {
    localStorage.removeItem('promptclip-settings');
    useUIStore.setState({
      modalType: null,
      selectedPromptId: null,
      isDetailOpen: false,
    });
    useSettingsStore.setState({
      locale: 'en-US',
      historySettings: { enabled: false, retentionDays: 30 },
      shareAuthorName: '',
    });
    useFileStore.setState({ workspace: null });
    usePromptStore.setState({
      prompts: [],
      filteredPrompts: [],
      filter: { searchQuery: '', tag: undefined, favoritesOnly: false, recentOnly: false },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens prompt content in source edit mode by default', () => {
    useUIStore.setState({ modalType: 'create' });

    const markup = renderToStaticMarkup(<CreateModal />);

    expect(markup).toContain('data-mode="text"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('<textarea');
  });

  it('keeps current edit content when another prompt is patched in the store', () => {
    const editingPrompt = createPrompt('editing', '原始正文');
    const otherPrompt = createPrompt('other', '其它正文');
    useUIStore.setState({ modalType: 'edit' });
    usePromptStore.setState({
      prompts: [editingPrompt, otherPrompt],
      filteredPrompts: [editingPrompt, otherPrompt],
    });

    render(<CreateModal editingPromptId="editing" />);

    const editor = screen.getByRole('textbox', {
      name: /content/i,
    }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '正在输入的正文' } });
    usePromptStore.setState({
      prompts: [editingPrompt, { ...otherPrompt, content: '后台补全的其它正文' }],
      filteredPrompts: [editingPrompt, { ...otherPrompt, content: '后台补全的其它正文' }],
    });

    expect(editor.value).toBe('正在输入的正文');
  });

  it('keeps current edit content when the edited prompt is patched in the store', () => {
    const editingPrompt = createPrompt('editing', '原始正文');
    useUIStore.setState({ modalType: 'edit' });
    usePromptStore.setState({
      prompts: [editingPrompt],
      filteredPrompts: [editingPrompt],
    });

    render(<CreateModal editingPromptId="editing" />);

    const editor = screen.getByRole('textbox', {
      name: /content/i,
    }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '正在输入的正文' } });
    usePromptStore.setState({
      prompts: [{ ...editingPrompt, copyCount: 1 }],
      filteredPrompts: [{ ...editingPrompt, copyCount: 1 }],
    });

    expect(editor.value).toBe('正在输入的正文');
  });

  it('does not overwrite user input when lazy content finishes loading', async () => {
    const editingPrompt = {
      ...createPrompt('editing', ''),
      isContentLoaded: false,
    };
    const fullPrompt = {
      ...editingPrompt,
      content: '后台加载完成的正文',
      isContentLoaded: true,
    };
    let resolveContent: (prompt: Prompt) => void = () => undefined;
    const ensureContentSpy = vi
      .spyOn(PromptService, 'ensureContent')
      .mockReturnValue(
        new Promise<Prompt>((resolve) => {
          resolveContent = resolve;
        })
      );
    useUIStore.setState({ modalType: 'edit' });
    useFileStore.setState({
      workspace: { id: 'workspace', name: 'Workspace', platform: 'web', handleKey: 'workspace' },
    });
    usePromptStore.setState({
      prompts: [editingPrompt],
      filteredPrompts: [editingPrompt],
    });

    render(<CreateModal editingPromptId="editing" />);

    const editor = screen.getByRole('textbox', {
      name: /content/i,
    }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '用户抢先输入的正文' } });
    resolveContent(fullPrompt);
    await waitFor(() => {
      expect(ensureContentSpy).toHaveBeenCalledTimes(1);
    });

    expect(editor.value).toBe('用户抢先输入的正文');
  });
});
