/**
 * 把键盘事件格式化为 Tauri 全局快捷键字符串（如 "CommandOrControl+Shift+Space"）。
 *
 * 纯函数，入参用结构化字段而非 DOM 的 KeyboardEvent，便于在 Node/jsdom 中单测。
 */

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

export interface ShortcutEventLike {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

/**
 * 从键盘事件提取 Tauri 快捷键字符串。
 * - 仅按下修饰键时返回 null（等待主键）
 * - Cmd/Ctrl 统一映射为 CommandOrControl（跨平台）
 * - 主键：单字符转大写，空格为 Space，多字符键（如 F1）原样保留
 */
export function formatShortcutFromEvent(event: ShortcutEventLike): string | null {
  const { key, shiftKey, altKey, ctrlKey, metaKey } = event;

  if (MODIFIER_KEYS.has(key)) {
    return null;
  }

  const parts: string[] = [];
  if (ctrlKey || metaKey) parts.push('CommandOrControl');
  if (altKey) parts.push('Alt');
  if (shiftKey) parts.push('Shift');

  let mainKey: string;
  if (key === ' ') {
    mainKey = 'Space';
  } else if (key.length === 1) {
    mainKey = key.toUpperCase();
  } else {
    mainKey = key;
  }
  parts.push(mainKey);

  return parts.join('+');
}
