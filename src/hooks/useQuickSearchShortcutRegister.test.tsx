import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_QUICK_SEARCH_SHORTCUT,
  useSettingsStore,
} from '@/stores/settingsStore';
import { useQuickSearchShortcutRegister } from './useQuickSearchShortcutRegister';

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

function HookHost() {
  useQuickSearchShortcutRegister();
  return null;
}

describe('useQuickSearchShortcutRegister', () => {
  afterEach(() => {
    cleanup();
    invokeMock.mockReset();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    useSettingsStore.setState({
      quickSearchEnabled: true,
      quickSearchShortcut: DEFAULT_QUICK_SEARCH_SHORTCUT,
    });
  });

  it('registers the configured shortcut when global quick search is enabled', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValue(undefined);

    render(<HookHost />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('set_quick_search_shortcut', {
        shortcut: DEFAULT_QUICK_SEARCH_SHORTCUT,
      });
    });
  });

  it('unregisters the shortcut when global quick search is disabled', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    useSettingsStore.setState({ quickSearchEnabled: false });
    invokeMock.mockResolvedValue(undefined);

    render(<HookHost />);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('unset_quick_search_shortcut');
    });
    expect(invokeMock).not.toHaveBeenCalledWith('set_quick_search_shortcut', {
      shortcut: DEFAULT_QUICK_SEARCH_SHORTCUT,
    });
  });
});
