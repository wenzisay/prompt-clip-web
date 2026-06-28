import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBaseCommands } from './CommandPalette';

describe('CommandPalette base commands', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not include the import prompts command', () => {
    const commands = createBaseCommands(vi.fn(), vi.fn());

    expect(commands.map((command) => command.label)).not.toContain('导入 Prompts');
  });

  it('opens settings in a new browser tab', () => {
    const closeCommandPalette = vi.fn();
    const openModal = vi.fn();
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
    const commands = createBaseCommands(closeCommandPalette, openModal);
    const settingsCommand = commands.find((command) => command.id === 'settings');

    settingsCommand?.action();

    expect(closeCommandPalette).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledWith('/settings', '_blank', 'noopener,noreferrer');
    expect(openModal).not.toHaveBeenCalledWith('settings');
  });
});
