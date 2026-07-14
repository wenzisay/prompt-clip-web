/**
 * analyticsService 单元测试
 *
 * 覆盖：env 守卫、桌面端门禁、开关软关闭、动态注入、幂等性、虚拟 page_view。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';
import { AnalyticsService, resetAnalyticsState } from './analyticsService';

vi.mock('@/services/fileRepository/tauriFileRepository', () => ({
  isTauriRuntime: vi.fn(),
}));

const GA_SCRIPT_SELECTOR = 'script[src*="gtag/js"]';

function getInjectedScripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll(GA_SCRIPT_SELECTOR));
}

function dataLayerEntries(): unknown[][] {
  return (window.dataLayer as unknown[][]) ?? [];
}

describe('analyticsService', () => {
  beforeEach(() => {
    resetAnalyticsState();
    getInjectedScripts().forEach((script) => script.remove());
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    vi.mocked(isTauriRuntime).mockReturnValue(false);
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TESTID');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not inject when measurement id is missing', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    AnalyticsService.initAnalytics();

    expect(getInjectedScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('does not inject when measurement id does not start with G-', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'UA-12345');
    AnalyticsService.initAnalytics();

    expect(getInjectedScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('injects gtag script and initializes dataLayer on the happy path', () => {
    AnalyticsService.initAnalytics();

    const scripts = getInjectedScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TESTID');
    expect(scripts[0].async).toBe(true);
    expect(typeof window.gtag).toBe('function');
    expect(window.dataLayer).toBeInstanceOf(Array);
    expect(window.dataLayer?.length).toBeGreaterThan(0);
  });

  it('configures GA4 with anonymize_ip and send_page_view disabled', () => {
    AnalyticsService.initAnalytics();

    const configCall = dataLayerEntries().find((entry) => entry[0] === 'config');
    expect(configCall).toBeDefined();
    expect(configCall?.[1]).toBe('G-TESTID');
    expect(configCall?.[2]).toMatchObject({ anonymize_ip: true, send_page_view: false });
  });

  it('sends an initial virtual page_view after init', () => {
    AnalyticsService.initAnalytics();

    const pageView = dataLayerEntries().find(
      (entry) => entry[0] === 'event' && entry[1] === 'page_view'
    );
    expect(pageView).toBeDefined();
    expect(pageView?.[2]).toHaveProperty('page_path');
    expect(pageView?.[2]).toHaveProperty('page_title');
  });

  it('does not inject on Tauri runtime', () => {
    vi.mocked(isTauriRuntime).mockReturnValue(true);
    AnalyticsService.initAnalytics();

    expect(getInjectedScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('does not inject when analytics is disabled', () => {
    AnalyticsService.setAnalyticsEnabled(false);
    AnalyticsService.initAnalytics();

    expect(getInjectedScripts()).toHaveLength(0);
  });

  it('injects when re-enabled from a disabled state', () => {
    AnalyticsService.setAnalyticsEnabled(false);
    expect(getInjectedScripts()).toHaveLength(0);

    AnalyticsService.setAnalyticsEnabled(true);
    expect(getInjectedScripts()).toHaveLength(1);
    expect(typeof window.gtag).toBe('function');
  });

  it('stops tracking events after being disabled', () => {
    AnalyticsService.initAnalytics();
    const before = dataLayerEntries().length;

    AnalyticsService.setAnalyticsEnabled(false);
    AnalyticsService.trackEvent('foo', { bar: 1 });

    expect(dataLayerEntries().length).toBe(before);
  });

  it('trackEvent is a no-op before init and queues after init', () => {
    AnalyticsService.trackEvent('before');
    expect(dataLayerEntries().length).toBe(0);

    AnalyticsService.initAnalytics();
    const before = dataLayerEntries().length;

    AnalyticsService.trackEvent('after', { k: 'v' });
    const entries = dataLayerEntries();
    expect(entries.length).toBe(before + 1);

    const last = entries[entries.length - 1];
    expect(last[0]).toBe('event');
    expect(last[1]).toBe('after');
  });

  it('trackPageView maps /privacy to the Privacy title', () => {
    AnalyticsService.initAnalytics();
    const before = dataLayerEntries().length;

    AnalyticsService.trackPageView('/privacy');
    const last = dataLayerEntries()[before];

    expect(last[1]).toBe('page_view');
    expect(last[2]).toMatchObject({ page_path: '/privacy', page_title: 'Privacy' });
  });

  it('is idempotent under repeated init (StrictMode safety)', () => {
    AnalyticsService.initAnalytics();
    AnalyticsService.initAnalytics();

    expect(getInjectedScripts()).toHaveLength(1);
  });
});
