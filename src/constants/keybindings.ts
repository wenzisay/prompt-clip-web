/**
 * 键盘快捷键定义
 */

export const KEYBINDINGS = {
  /** 命令面板 */
  COMMAND_PALETTE: 'Cmd+K',
  /** 新建 Prompt */
  NEW_PROMPT: 'Cmd+N',
  /** 保存 */
  SAVE: 'Cmd+S',
  /** 关闭面板/模态框 */
  CLOSE: 'Escape',
  /** 快速切换到全部 */
  VIEW_ALL: 'Cmd+1',
  /** 快速切换到最近修改 */
  VIEW_RECENT: 'Cmd+2',
  /** 快速切换到收藏 */
  VIEW_FAVORITES: 'Cmd+3',
  /** 复制 */
  COPY: 'Cmd+C',
  /** 粘贴 */
  PASTE: 'Cmd+V',
  /** 搜索 */
  SEARCH: 'Cmd+F',
  /** 删除 */
  DELETE: 'Backspace',
} as const;

/**
 * 快捷键描述（用于显示）
 */
export const KEYBINDING_DESCRIPTIONS = {
  [KEYBINDINGS.COMMAND_PALETTE]: '打开命令面板',
  [KEYBINDINGS.NEW_PROMPT]: '新建 Prompt',
  [KEYBINDINGS.SAVE]: '保存',
  [KEYBINDINGS.CLOSE]: '关闭',
  [KEYBINDINGS.VIEW_ALL]: '显示全部',
  [KEYBINDINGS.VIEW_RECENT]: '显示最近修改',
  [KEYBINDINGS.VIEW_FAVORITES]: '显示收藏',
  [KEYBINDINGS.COPY]: '复制',
  [KEYBINDINGS.PASTE]: '粘贴',
  [KEYBINDINGS.SEARCH]: '搜索',
  [KEYBINDINGS.DELETE]: '删除',
} as const;

/**
 * 修饰键映射（Mac vs Windows/Linux）
 */
export const MODIFIER_KEY = {
  CMD_OR_CTRL: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Meta' : 'Ctrl',
  OPT_OR_ALT: navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Alt' : 'Alt',
} as const;
