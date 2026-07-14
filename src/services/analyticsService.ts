/**
 * 使用统计分析服务（Google Analytics 4，仅 Web 端）
 *
 * 设计要点：
 * - 仅 Web 端加载 gtag.js；桌面端（Tauri）经 isTauriRuntime() 门禁，零网络请求。
 * - Measurement ID 走环境变量 VITE_GA_MEASUREMENT_ID，缺失或非法则静默降级。
 * - 开关状态由 settingsStore 单向 push（setAnalyticsEnabled），service 不反向依赖 store。
 * - 关闭采用「软关闭」：不卸载已注入的 script（删除会破坏 gtag 内部状态且无隐私收益），
 *   仅停止后续事件上报；已发事件无法撤回——此约束在隐私页与设置开关处如实告知。
 * - 隐私红线：只传事件名 + 计数/类别参数，绝不传 Prompt 标题/正文/路径/标签值。
 */

import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';

const GTAG_SCRIPT_SRC = 'https://www.googletagmanager.com/gtag/js';

/** 是否已注入 gtag.js。保证幂等，兼 dev 下 StrictMode 双调用。 */
let initialized = false;

/** 是否允许上报。由 settingsStore.setAnalyticsEnabled 单向 push；默认开启。 */
let enabledFlag = true;

function getMeasurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  return id && id.startsWith('G-') ? id : undefined;
}

function derivePageTitle(path: string): string {
  switch (path) {
    case '/privacy':
      return 'Privacy';
    case '/about':
      return 'About';
    case '/support':
      return 'Support';
    case '/':
      return 'Workspace';
    default:
      return path;
  }
}

/**
 * 初始化 GA4 并动态注入 gtag.js。多重守卫保护，任一不满足即静默 return。
 *
 * @param options.force 强制重新注入（用于开关从关闭切回开启时）。
 */
export function initAnalytics(options?: { force?: boolean }): void {
  if (typeof window === 'undefined') return;
  if (isTauriRuntime()) return;
  if (initialized && !options?.force) return;
  if (!enabledFlag) return;

  const measurementId = getMeasurementId();
  if (!measurementId) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(): void {
    // eslint-disable-next-line prefer-rest-params -- gtag.js requires the native arguments object.
    window.dataLayer?.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `${GTAG_SCRIPT_SRC}?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: false,
  });

  initialized = true;
  // 项目无路由，手动发送首条虚拟 page_view。
  trackPageView();
}

/**
 * 上报事件。未初始化 / 已关闭 / 无 gtag 时静默 no-op。
 *
 * @param name 事件名（如 'workspace_opened'）。
 * @param params 仅计数/类别参数，禁止包含 Prompt 内容。
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!initialized || !enabledFlag) return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/**
 * 上报虚拟 page_view。
 *
 * @param path 缺省取当前 pathname；映射为 page_title。
 */
export function trackPageView(path?: string): void {
  const pagePath = path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: derivePageTitle(pagePath),
  });
}

/**
 * 设置上报开关（由 settingsStore 调用）。关闭=软关闭，不卸载 script。
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  enabledFlag = enabled;
  if (enabled && !initialized) {
    initAnalytics({ force: true });
  }
}

/**
 * 复位模块状态。仅测试使用。
 */
export function resetAnalyticsState(): void {
  initialized = false;
  enabledFlag = true;
}

export const AnalyticsService = {
  initAnalytics,
  trackEvent,
  trackPageView,
  setAnalyticsEnabled,
  resetAnalyticsState,
} as const;
