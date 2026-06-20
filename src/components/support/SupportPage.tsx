import { useEffect, useState } from 'react';

export type SupportLanguage = 'zh' | 'en';

interface SupportUsefulLink {
  label: string;
  url: string;
}

interface SupportCopy {
  htmlLang: string;
  pageTitle: string;
  metaDescription: string;
  backHome: string;
  languageLabel: string;
  title: string;
  subtitle: string;
  contactIntro: string;
  contactLabel: string;
  contactTopicsTitle: string;
  contactTopics: readonly string[];
  usefulLinksTitle: string;
  usefulLinks: readonly SupportUsefulLink[];
  footer: string;
}

export interface SupportPageContentProps {
  initialLanguage?: SupportLanguage;
}

const contactEmail = 'promptclip@outlook.com';

const privacyPolicyUrl = 'https://www.promptclip.online/privacy';
const officialWebsiteUrl = 'https://www.promptclip.online';

const supportCopyByLanguage: Record<SupportLanguage, SupportCopy> = {
  zh: {
    htmlLang: 'zh-Hans',
    pageTitle: 'PromptClip 技术支持',
    metaDescription: 'PromptClip 技术支持：获取帮助、反馈问题与建议。',
    backHome: '返回首页',
    languageLabel: '切换技术支持页面语言',
    title: '技术支持',
    subtitle: '我们随时为你提供帮助',
    contactIntro: '如果你需要 PromptClip 的帮助，请通过以下方式联系我们：',
    contactLabel: '邮箱：',
    contactTopicsTitle: '你可以就以下问题联系我们',
    contactTopics: [
      '应用使用问题',
      'Bug 反馈',
      '数据导入/导出问题',
      '功能建议',
      '购买或订阅问题（如适用）',
    ],
    usefulLinksTitle: '有用链接',
    usefulLinks: [
      { label: '隐私政策', url: privacyPolicyUrl },
      { label: '官方网站', url: officialWebsiteUrl },
    ],
    footer: '© PromptClip. All rights reserved.',
  },
  en: {
    htmlLang: 'en',
    pageTitle: 'PromptClip Support',
    metaDescription: 'PromptClip Support: get help, report issues, and share suggestions.',
    backHome: 'Back home',
    languageLabel: 'Switch support page language',
    title: 'PromptClip Support',
    subtitle: "We're here to help",
    contactIntro: 'If you need help with PromptClip, please contact us:',
    contactLabel: 'Email: ',
    contactTopicsTitle: 'You can contact us for:',
    contactTopics: [
      'App usage questions',
      'Bug reports',
      'Data import/export issues',
      'Feature suggestions',
      'Purchase or subscription issues, if applicable',
    ],
    usefulLinksTitle: 'Useful links',
    usefulLinks: [
      { label: 'Privacy Policy', url: privacyPolicyUrl },
      { label: 'Official Website', url: officialWebsiteUrl },
    ],
    footer: '© PromptClip. All rights reserved.',
  },
};

const pageClassName = 'h-screen w-screen overflow-y-auto bg-bg text-fg';
const mainClassName = 'mx-auto w-full max-w-[840px] px-3 py-5 sm:px-6 sm:py-12';
const articleClassName = [
  'min-h-screen border-border bg-surface px-6 py-8 text-base leading-7 shadow-card',
  'sm:min-h-0 sm:border sm:px-14 sm:py-14 sm:text-[17px] sm:leading-8',
].join(' ');
const navClassName = 'mb-10 flex items-center justify-between gap-4 text-sm text-muted';
const homeLinkClassName = [
  'inline-flex items-center gap-1.5 font-medium text-muted transition hover:text-fg',
  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-4',
].join(' ');
const languageToggleClassName = [
  'inline-flex rounded-lg border border-border bg-surfaceDim p-1',
  'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2',
].join(' ');
const languageButtonClassName =
  'rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none';
const titleClassName = [
  'font-display text-[34px] font-bold leading-tight tracking-[0] text-fg',
  'sm:text-[42px]',
].join(' ');
const subtitleClassName = 'mt-3 font-display text-lg font-semibold leading-7 text-fg';
const sectionTitleClassName = 'font-display text-xl font-semibold leading-7 tracking-[0] text-fg';
const externalLinkClassName = 'font-medium text-accent underline transition hover:opacity-80';

function getLanguageButtonClassName(isActive: boolean): string {
  if (isActive) {
    return `${languageButtonClassName} bg-accent text-white shadow-card`;
  }

  return `${languageButtonClassName} text-muted hover:text-fg`;
}

function syncSupportDocumentMetadata(copy: SupportCopy): () => void {
  const previousTitle = document.title;
  const previousLang = document.documentElement.lang;
  const existingDescription = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]'
  );
  const metaDescription = existingDescription ?? document.createElement('meta');
  const previousDescription = metaDescription.getAttribute('content');

  if (!existingDescription) {
    metaDescription.name = 'description';
    document.head.appendChild(metaDescription);
  }

  document.title = copy.pageTitle;
  document.documentElement.lang = copy.htmlLang;
  metaDescription.content = copy.metaDescription;

  return () => {
    document.title = previousTitle;
    document.documentElement.lang = previousLang;

    if (!existingDescription) {
      metaDescription.remove();
      return;
    }

    if (previousDescription === null) {
      metaDescription.removeAttribute('content');
    } else {
      metaDescription.content = previousDescription;
    }
  };
}

/**
 * 从 URL 查询参数解析技术支持页面的初始语言。
 * 仅当 `lang` 以 `en` 开头时返回英文，其余（含缺失、未知值）默认中文。
 */
export function parseSupportLanguage(search: string): SupportLanguage {
  const lang = new URLSearchParams(search).get('lang');

  if (lang && lang.toLowerCase().startsWith('en')) {
    return 'en';
  }

  return 'zh';
}

function getInitialLanguageFromUrl(): SupportLanguage {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  return parseSupportLanguage(window.location.search);
}

/**
 * 将当前语言同步写入 URL 的 `?lang=` 参数（不触发跳转/刷新），
 * 以便刷新后保持语言、链接可分享指定语言版本。
 */
function syncLanguageToUrl(language: SupportLanguage): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  window.history.replaceState(window.history.state, '', url);
}

export function SupportPageContent({ initialLanguage = 'zh' }: SupportPageContentProps) {
  const [language, setLanguage] = useState<SupportLanguage>(initialLanguage);
  const copy = supportCopyByLanguage[language];

  useEffect(() => {
    return syncSupportDocumentMetadata(copy);
  }, [copy]);

  function handleLanguageChange(next: SupportLanguage) {
    setLanguage(next);
    syncLanguageToUrl(next);
  }

  return (
    <div className={pageClassName}>
      <main className={mainClassName}>
        <article className={articleClassName}>
          <nav className={navClassName} aria-label="Support">
            <a href="/" className={homeLinkClassName}>
              <span className="material-symbols-outlined text-[18px] leading-none">
                arrow_back
              </span>
              <span>{copy.backHome}</span>
            </a>
            <div className={languageToggleClassName} aria-label={copy.languageLabel}>
              <button
                type="button"
                className={getLanguageButtonClassName(language === 'zh')}
                aria-pressed={language === 'zh'}
                onClick={() => handleLanguageChange('zh')}
              >
                中文
              </button>
              <button
                type="button"
                className={getLanguageButtonClassName(language === 'en')}
                aria-pressed={language === 'en'}
                onClick={() => handleLanguageChange('en')}
              >
                English
              </button>
            </div>
          </nav>

          <header className="border-b border-border pb-8">
            <h1 className={titleClassName}>{copy.title}</h1>
            <p className={subtitleClassName}>{copy.subtitle}</p>
          </header>

          <section className="mt-10">
            <p className="text-lg font-medium leading-8 text-fg">{copy.contactIntro}</p>
            <p className="mt-4 border border-border bg-surfaceDim px-5 py-4">
              {copy.contactLabel}
              <a className="font-medium text-accent underline" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </p>
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <h2 className={sectionTitleClassName}>{copy.contactTopicsTitle}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-fg/90">
              {copy.contactTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <h2 className={sectionTitleClassName}>{copy.usefulLinksTitle}</h2>
            <ul className="mt-4 space-y-3 text-fg/90">
              {copy.usefulLinks.map((link) => (
                <li key={link.url}>
                  <a
                    className={externalLinkClassName}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <footer className="mt-12 border-t border-border pt-7 text-sm text-muted">
            {copy.footer}
          </footer>
        </article>
      </main>
    </div>
  );
}

export function SupportPage() {
  return <SupportPageContent initialLanguage={getInitialLanguageFromUrl()} />;
}
