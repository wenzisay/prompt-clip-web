import { describe, expect, it, vi } from 'vitest';
import type { Prompt } from '@/types/prompt';
import {
  PromptCard,
  PromptCardActionsMenu,
  copyPromptToClipboard,
  getPromptCardDate,
  getPromptPreview,
} from './PromptCard';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromptService } from '@/services/promptService';
import { createFakeFileRepository, createFakeWorkspace } from '@/services/fileRepository';
import { usePromptStore } from '@/stores/promptStore';
import { useSettingsStore } from '@/stores/settingsStore';

const prompt: Prompt = {
  id: 'date-card',
  title: 'Date Card',
  content: 'Content',
  preview: 'Content',
  isContentLoaded: true,
  tags: [],
  createdAt: new Date('2026-05-17T00:00:00.000Z'),
  updatedAt: new Date('2026-05-16T00:00:00.000Z'),
  copyCount: 0,
  pinned: true,
  pinnedAt: new Date('2026-05-15T00:00:00.000Z'),
  filePath: 'date-card.md',
};

describe('PromptCard date display', () => {
  it('shows created time in all view', () => {
    const date = getPromptCardDate(prompt);

    expect(date).toBe(prompt.createdAt);
  });

  it('shows created time in recently modified view', () => {
    const date = getPromptCardDate(prompt);

    expect(date).toBe(prompt.createdAt);
  });

  it('shows created time in favorites view', () => {
    const date = getPromptCardDate(prompt);

    expect(date).toBe(prompt.createdAt);
  });

  it('shows created time when favorite has no pinned time', () => {
    const date = getPromptCardDate({ ...prompt, pinnedAt: undefined });

    expect(date).toBe(prompt.createdAt);
  });
});

describe('PromptCard preview text', () => {
  it('uses the first four lines joined by a space', () => {
    const preview = getPromptPreview('第一行\n第二行\n第三行\n第四行\n第五行不应该进入预览');

    expect(preview).toEqual({
      text: '第一行 第二行 第三行 第四行',
      isTruncated: true,
    });
  });

  it('limits preview text to 120 characters', () => {
    const preview = getPromptPreview(`${'a'.repeat(130)}\n第二行`);

    expect(preview.text).toHaveLength(120);
    expect(preview.isTruncated).toBe(true);
  });
});

describe('PromptCardActionsMenu', () => {
  it('renders the share action in the menu', () => {
    const noop = () => undefined;
    const markup = renderToStaticMarkup(
      <PromptCardActionsMenu
        isSelected={false}
        isPinned={false}
        locale="zh-CN"
        onDelete={noop}
        onEdit={noop}
        onSelect={noop}
        onShare={noop}
        onTogglePin={noop}
      />
    );

    expect(markup).toContain('分享');
    expect(markup).toContain('ios_share');
  });

  it('raises the open card and menu above neighboring cards', () => {
    useSettingsStore.setState({ locale: 'zh-CN' });
    const { container } = render(<PromptCard prompt={prompt} />);

    fireEvent.click(screen.getByLabelText('更多操作'));

    const card = container.querySelector('.prompt-card');
    const menu = screen.getByText('分享').closest('div');
    expect(card?.className).toContain('relative z-30');
    expect(menu?.className).toContain('z-40');
  });
});

describe('copyPromptToClipboard', () => {
  const workspace = createFakeWorkspace();

  function stubClipboard() {
    const writeTextSpy = vi.fn(async () => undefined);
    const clipboard = { writeText: writeTextSpy };
    const originalClipboard = (navigator as unknown as { clipboard?: { writeText: typeof writeTextSpy } }).clipboard;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    return {
      writeTextSpy,
      restore: () => {
        if (originalClipboard === undefined) {
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
        } else {
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
        }
      },
    };
  }

  it('calls ensureContent before writing to the clipboard when content is not loaded', async () => {
    const headOnly: Prompt = {
      ...prompt,
      id: 'lazy',
      filePath: 'lazy.md',
      content: '',
      preview: 'preview only',
      isContentLoaded: false,
    };
    usePromptStore.setState({ prompts: [headOnly], filteredPrompts: [headOnly] });
    const repository = createFakeFileRepository({
      files: {
        'lazy.md': ['---', 'id: "17474772000000000"', '---', '', 'full body'].join('\n'),
      },
    });
    const clipboard = stubClipboard();

    try {
      await copyPromptToClipboard({
        prompt: headOnly,
        workspace,
        repository,
        onCopied: () => undefined,
      });
    } finally {
      clipboard.restore();
    }

    expect(clipboard.writeTextSpy).toHaveBeenCalledWith('full body');
    const stored = usePromptStore.getState().prompts.find((p) => p.id === 'lazy');
    expect(stored?.copyCount).toBe(1);
    expect(stored?.isContentLoaded).toBe(true);
  });

  it('skips ensureContent when content is already loaded', async () => {
    usePromptStore.setState({ prompts: [prompt], filteredPrompts: [prompt] });
    const repository = createFakeFileRepository();
    const ensureContentSpy = vi
      .spyOn(PromptService, 'ensureContent')
      .mockResolvedValue(prompt);
    const clipboard = stubClipboard();

    try {
      await copyPromptToClipboard({
        prompt,
        workspace,
        repository,
        onCopied: () => undefined,
      });
    } finally {
      clipboard.restore();
      ensureContentSpy.mockRestore();
    }

    expect(ensureContentSpy).not.toHaveBeenCalled();
    expect(clipboard.writeTextSpy).toHaveBeenCalledWith('Content');
  });

  it('calls onCopied after clipboard write succeeds', async () => {
    usePromptStore.setState({ prompts: [prompt], filteredPrompts: [prompt] });
    const repository = createFakeFileRepository();
    const clipboard = stubClipboard();
    const onCopied = vi.fn();

    try {
      await copyPromptToClipboard({
        prompt,
        workspace,
        repository,
        onCopied,
      });
    } finally {
      clipboard.restore();
    }

    expect(onCopied).toHaveBeenCalledTimes(1);
  });
});
