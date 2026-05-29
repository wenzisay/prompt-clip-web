/**
 * UI 状态相关类型
 */

/**
 * 模态框类型
 */
export type ModalType = 'create' | 'edit' | 'delete' | 'export' | 'settings' | 'share' | null;

/**
 * 面板状态
 */
export interface PanelState {
  /** 详情面板是否打开 */
  isDetailOpen: boolean;
  /** 当前选中的 Prompt ID */
  selectedPromptId: string | null;
  /** 批量选中的 Prompt IDs */
  selectedPromptIds: string[];
}

/**
 * 加载状态
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Toast 消息类型
 */
export type ToastType = 'success' | 'error' | 'info';

/**
 * Toast 消息
 */
export interface Toast {
  /** 唯一标识 */
  id: string;
  /** 消息类型 */
  type: ToastType;
  /** 消息内容 */
  message: string;
  /** 显示时长（毫秒），0 表示不自动关闭 */
  duration: number;
}

/**
 * 视图模式
 */
export type ViewMode = 'all' | 'recent' | 'favorites';

/**
 * 键盘快捷键
 */
export interface KeyBinding {
  /** 快捷键描述 */
  description: string;
  /** 键组合（如 'Cmd+K'） */
  key: string;
  /** 处理函数 */
  handler: () => void;
}
