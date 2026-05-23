import { describe, expect, it } from 'vitest';
import { getCommandPaletteShortcutLabel } from './TopBar';

describe('TopBar command palette shortcut label', () => {
  it('uses Command on macOS', () => {
    expect(getCommandPaletteShortcutLabel('MacIntel')).toBe('快速切换 Command K');
  });

  it('uses Ctrl on Windows', () => {
    expect(getCommandPaletteShortcutLabel('Win32')).toBe('快速切换 Ctrl K');
  });
});
