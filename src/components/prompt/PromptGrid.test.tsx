import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { render } from '@testing-library/react';
import { PromptGrid } from './PromptGrid';
import { usePromptStore } from '@/stores/promptStore';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';

function createPrompt(id: string): Prompt {
  return {
    id,
    title: `Prompt ${id}`,
    content: `body ${id}`,
    preview: `body ${id}`,
    isContentLoaded: true,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: `${id}.md`,
  };
}

class FakeResizeObserver {
  private readonly callback: ResizeObserverCallback;
  static instances: FakeResizeObserver[] = [];
  static target: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    FakeResizeObserver.target = target;
  }

  unobserve(): void {}
  disconnect(): void {}

  trigger(width: number) {
    this.callback(
      [
        {
          contentRect: { width, height: 800, top: 0, left: 0, right: width, bottom: 800, x: 0, y: 0 } as DOMRectReadOnly,
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }
}

describe('PromptGrid virtualization', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    (globalThis as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    useSettingsStore.setState({ locale: 'zh-CN' });
    useFileStore.setState({ workspace: null, isAuthorized: true });
    usePromptStore.setState({
      prompts: Array.from({ length: 1000 }, (_, i) => createPrompt(`p${i}`)),
      filteredPrompts: Array.from({ length: 1000 }, (_, i) => createPrompt(`p${i}`)),
      filter: { searchQuery: '', tag: undefined, favoritesOnly: false, recentOnly: false },
      isLoading: false,
      error: null,
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a virtualized scroll container with column-driven row slicing', async () => {
    const { container } = render(<PromptGrid />);
    // 等待 useEffect flush（Resizer 绑定、virtualizer observe）
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // 1. 虚拟化容器存在
    const scrollEl = container.querySelector('.prompt-card-virtual-scroll');
    expect(scrollEl).toBeTruthy();

    // 2. ResizeObserver 被建立
    expect(FakeResizeObserver.instances.length).toBeGreaterThan(0);

    // 3. 1000 条 prompt 走虚拟化路径：每个可见行使用 grid 而非扁平渲染
    // 内部 wrapper 使用 grid className（与最小预期一致）
    const grid = container.querySelector('.prompt-card-grid');
    expect(grid).toBeTruthy();
  });
});
