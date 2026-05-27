import { describe, expect, it } from 'vitest';
import { getCommandPaletteShortcutKeyParts } from './TopBar';

describe('TopBar command palette shortcut label', () => {
  it('uses the Command symbol on macOS', () => {
    expect(getCommandPaletteShortcutKeyParts('MacIntel')).toEqual({
      modifier: '⌘',
      key: 'K',
      shortcut: 'Command K',
    });
  });

  it('uses Ctrl on Windows', () => {
    expect(getCommandPaletteShortcutKeyParts('Win32')).toEqual({
      modifier: 'Ctrl',
      key: 'K',
      shortcut: 'Ctrl K',
    });
  });
});
