import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool } from '@/types/skill';
import { getVisibleToolCount, SkillAgentToolBar } from './SkillAgentToolBar';

const tools: AgentTool[] = Array.from({ length: 8 }, (_, index) => ({
  id: `agent-${index}`,
  name: `Agent ${index}`,
  installed: true,
  detectionReasons: ['config'],
  configPath: `/home/.agent-${index}`,
  skillsPath: `/home/.agent-${index}/skills`,
  targetGroupId: `group-${index}`,
  syncMode: 'inherit',
  effectiveSyncMode: 'copy',
  copyOnly: false,
  iconId: 'codex',
  source: 'builtin',
  enabled: true,
}));

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(): void {}

  disconnect(): void {}

  trigger(width: number): void {
    this.callback(
      [{ contentRect: { width } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
}

const originalResizeObserver = globalThis.ResizeObserver;

function renderCollapsed(): void {
  render(
    <SkillAgentToolBar
      tools={tools}
      moreLabel="More tools"
      renderTool={(tool) => <button type="button">{tool.name}</button>}
    />
  );
}

describe('getVisibleToolCount', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    (globalThis as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it('keeps every tool when the row has enough space', () => {
    expect(getVisibleToolCount(400, 8)).toBe(8);
  });

  it('reserves room for the more button when tools overflow the row', () => {
    // 8 tools, 360px: 376px needed for all → overflow. With a 40px more tile:
    // (360 - 40 - 8 + 8) / (40 + 8) = 6 visible.
    expect(getVisibleToolCount(360, 8)).toBe(6);
  });

  it('returns no visible tools when only the more button fits', () => {
    expect(getVisibleToolCount(64, 3)).toBe(0);
  });

  it('recalculates overflow when the card width changes', async () => {
    renderCollapsed();

    expect(screen.getByRole('button', { name: 'More tools' })).toBeTruthy();

    await waitFor(() => {
      FakeResizeObserver.instances[0]?.trigger(600);
      expect(screen.queryByRole('button', { name: 'More tools' })).toBeNull();
    });
  });
});

describe('more menu interaction', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    (globalThis as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it('shows a +N tile whose label reflects the hidden count', () => {
    renderCollapsed();
    const trigger = screen.getByRole('button', { name: 'More tools' });
    expect(trigger.textContent?.trim()).toBe('+2');
  });

  it('opens the floating menu on click and renders hidden tools', () => {
    renderCollapsed();
    const trigger = screen.getByRole('button', { name: 'More tools' });

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const menu = screen.getByRole('menu');
    expect(menu).toBeTruthy();
    // The collapsed row (360 default → 6 visible) hides the last 2 agents.
    expect(menu.textContent).toContain('Agent 6');
    expect(menu.textContent).toContain('Agent 7');
  });

  it('closes the menu when clicking outside', () => {
    renderCollapsed();
    const trigger = screen.getByRole('button', { name: 'More tools' });

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByRole('menu')).toBeTruthy();

    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      );
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes the menu on Escape', () => {
    renderCollapsed();
    const trigger = screen.getByRole('button', { name: 'More tools' });

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByRole('menu')).toBeTruthy();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('auto-collapses when the row grows to fit every tool', async () => {
    renderCollapsed();
    const trigger = screen.getByRole('button', { name: 'More tools' });

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.getByRole('menu')).toBeTruthy();

    await waitFor(() => {
      FakeResizeObserver.instances[0]?.trigger(600);
      expect(screen.queryByRole('menu')).toBeNull();
    });
  });
});
