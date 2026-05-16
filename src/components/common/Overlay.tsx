/**
 * 遮罩层组件
 */

export interface OverlayProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 点击关闭回调 */
  onClose?: () => void;
  /** z-index */
  zIndex?: number;
  /** 透明度 */
  opacity?: number;
  /** 是否模糊背景 */
  blur?: boolean;
}

export function Overlay({
  isOpen,
  onClose,
  zIndex = 40,
  opacity = 0.4,
  blur = false,
}: OverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black transition-opacity duration-200 ${
        blur ? 'backdrop-blur-sm' : ''
      }`}
      style={{
        opacity,
        zIndex,
      }}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
