import { useEffect } from 'react';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AboutPage } from '@/components/about';
import { PrivacyPage } from '@/components/privacy';
import { PromptManagerPage } from '@/components/prompt';
import { SkillManagerPage } from '@/components/skill';
import { SupportPage } from '@/components/support';
import { useQuickSearchBridge } from '@/hooks/useQuickSearchBridge';
import { useQuickSearchShortcutRegister } from '@/hooks/useQuickSearchShortcutRegister';
import { isQuickSearchWindowLocation, QuickSearchApp } from '@/quickSearch';
import { AnalyticsService } from '@/services/analyticsService';
import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';
import { useFileStore } from '@/stores/fileStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore, type AppSection } from '@/stores/uiStore';

export function isAboutPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  return normalizedPathname === '/about';
}

export function isPrivacyPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  return normalizedPathname === '/privacy';
}

export function isSupportPath(pathname: string): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
  return normalizedPathname === '/support';
}

export type AppView = 'welcome' | 'prompts' | 'skills';

export function resolveAppView(
  section: AppSection,
  isDesktop: boolean,
  isAuthorized: boolean,
  hasWorkspace: boolean
): AppView {
  if (isDesktop && section === 'skills') return 'skills';
  if (isAuthorized && hasWorkspace) return 'prompts';
  return 'welcome';
}

function getCurrentPathname(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

function AppContent() {
  const { isAuthorized, workspace, initialize } = useFileStore();
  const appSection = useUIStore((state) => state.appSection);
  const locale = useSettingsStore((state) => state.locale);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    AnalyticsService.setAnalyticsEnabled(useSettingsStore.getState().analyticsEnabled);
  }, []);

  useEffect(() => {
    const languageByLocale = {
      'zh-CN': 'zh-Hans',
      'zh-TW': 'zh-Hant',
      'ja-JP': 'ja',
      'en-US': 'en',
    } as const;
    document.documentElement.lang = languageByLocale[locale];
  }, [locale]);

  useQuickSearchBridge();
  useQuickSearchShortcutRegister();

  const view = resolveAppView(
    appSection,
    isTauriRuntime(),
    isAuthorized,
    workspace !== null
  );
  if (view === 'skills') return <SkillManagerPage />;
  if (view === 'prompts') return <PromptManagerPage />;
  return <WelcomeScreen />;
}

interface AppRouterProps {
  pathname?: string;
}

export function AppRouter({ pathname = getCurrentPathname() }: AppRouterProps) {
  if (isAboutPath(pathname)) return <AboutPage />;
  if (isPrivacyPath(pathname)) return <PrivacyPage />;
  if (isSupportPath(pathname)) return <SupportPage />;
  return <AppContent />;
}

export default function App() {
  if (
    isQuickSearchWindowLocation(
      typeof window !== 'undefined' ? window.location.search : ''
    )
  ) {
    return <QuickSearchApp />;
  }
  return <AppRouter />;
}
