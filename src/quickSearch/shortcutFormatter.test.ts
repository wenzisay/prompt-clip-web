import { describe, it, expect } from 'vitest';
import { formatShortcutFromEvent } from './shortcutFormatter';

function evt(
  key: string,
  mods: { shift?: boolean; alt?: boolean; ctrl?: boolean; meta?: boolean } = {}
) {
  return {
    key,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
    ctrlKey: !!mods.ctrl,
    metaKey: !!mods.meta,
  };
}

describe('formatShortcutFromEvent', () => {
  it('should return null when only a modifier is pressed', () => {
    expect(formatShortcutFromEvent(evt('Shift', { shift: true }))).toBeNull();
    expect(formatShortcutFromEvent(evt('Meta', { meta: true }))).toBeNull();
  });

  it('should map Cmd or Ctrl to CommandOrControl', () => {
    expect(formatShortcutFromEvent(evt('k', { meta: true }))).toBe('CommandOrControl+K');
    expect(formatShortcutFromEvent(evt('k', { ctrl: true }))).toBe('CommandOrControl+K');
  });

  it('should format Ctrl+Shift+Space', () => {
    expect(formatShortcutFromEvent(evt(' ', { ctrl: true, shift: true }))).toBe(
      'CommandOrControl+Shift+Space'
    );
  });

  it('should uppercase single-char keys', () => {
    expect(formatShortcutFromEvent(evt('a', { ctrl: true }))).toBe('CommandOrControl+A');
  });

  it('should keep multi-char keys like F1 as-is', () => {
    expect(formatShortcutFromEvent(evt('F1', { ctrl: true }))).toBe('CommandOrControl+F1');
  });

  it('should include Alt and order modifiers consistently', () => {
    expect(formatShortcutFromEvent(evt('p', { ctrl: true, alt: true }))).toBe(
      'CommandOrControl+Alt+P'
    );
  });
});
