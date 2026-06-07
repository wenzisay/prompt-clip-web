import { useEffect, useState } from 'react';
import { messages, useTranslation, type Locale } from '@/i18n';

type AboutPageLanguage = 'zh-CN' | 'en-US';

const FOOTER_TEXT = 'PromptClip · Local-first personal prompt workspace';

const htmlLangByLocale: Record<Locale, string> = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'en-US': 'en',
  'ja-JP': 'ja',
};

const pageClassName = 'h-screen w-screen overflow-y-auto bg-bg text-fg';
const mainClassName = 'mx-auto w-full max-w-[840px] px-0 py-0 sm:px-6 sm:py-12';
const articleClassName = [
  'min-h-screen border-border bg-surface px-6 py-12 font-serif',
  'text-[17px] leading-8 sm:min-h-0 sm:border sm:px-14 sm:py-16',
  'sm:text-[18px] sm:leading-9 lg:px-[72px]',
].join(' ');
const kickerClassName = [
  'mb-7 font-mono text-[13px] font-medium uppercase leading-none',
  'tracking-[0] text-muted',
].join(' ');
const homeLinkClassName = [
  'inline-flex items-center gap-1.5 font-mono text-xs font-medium',
  'leading-none text-muted transition hover:text-fg focus:outline-none',
  'focus:ring-2 focus:ring-accent focus:ring-offset-4',
].join(' ');
const navClassName = 'mb-8 flex items-center justify-between gap-4';
const languageToggleClassName = [
  'inline-flex rounded-lg border border-border bg-surfaceDim p-1',
  'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2',
].join(' ');
const languageButtonClassName =
  'rounded-md px-3 py-1.5 font-mono text-xs font-medium leading-none transition focus:outline-none';
const privacyLinkClassName = [
  'mt-2 inline-block font-mono text-xs leading-5 text-muted transition',
  'hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent',
  'focus:ring-offset-4',
].join(' ');
const titleClassName = [
  'font-display text-[38px] font-bold leading-none tracking-[0] text-fg',
  'sm:text-[44px]',
].join(' ');
const subtitleClassName = [
  'mt-4 font-display text-lg font-semibold leading-7 tracking-[0] text-fg',
  'sm:text-xl',
].join(' ');
const introSentenceClassName = [
  'mt-5 font-display text-lg font-semibold leading-8 tracking-[0] text-fg',
].join(' ');
const sectionTitleClassName = [
  'mb-5 font-display text-xl font-semibold leading-7 tracking-[0] text-fg',
].join(' ');
const finalParagraphClassName = [
  'mt-12 border-t border-border pt-8 text-lg font-medium leading-8 text-fg',
  'sm:mt-14 sm:text-xl sm:leading-9',
].join(' ');

interface AboutPageContentProps {
  locale: Locale;
}

interface AboutSectionData {
  title: string;
  paragraphs: readonly string[];
}

const aboutHomeLinkByLocale: Record<Locale, string> = {
  'zh-CN': '返回主页',
  'zh-TW': '返回首頁',
  'en-US': 'Back home',
  'ja-JP': 'ホームへ戻る',
};

const aboutPrivacyLinkByLocale: Record<Locale, string> = {
  'zh-CN': '隐私政策',
  'zh-TW': '隱私政策',
  'en-US': 'Privacy policy',
  'ja-JP': 'プライバシーポリシー',
};

function toAboutPageLanguage(locale: Locale): AboutPageLanguage {
  return locale === 'en-US' ? 'en-US' : 'zh-CN';
}

function getLanguageButtonClassName(isActive: boolean): string {
  if (isActive) {
    return `${languageButtonClassName} bg-accent text-white shadow-card`;
  }

  return `${languageButtonClassName} text-muted hover:text-fg`;
}

function splitIntroParagraph(paragraph: string): { lead: string; sentence: string | null } {
  const chineseSeparatorIndex = paragraph.indexOf('：');
  if (chineseSeparatorIndex >= 0) {
    return {
      lead: paragraph.slice(0, chineseSeparatorIndex + 1),
      sentence: paragraph.slice(chineseSeparatorIndex + 1),
    };
  }

  const englishSeparatorIndex = paragraph.indexOf(': ');
  if (englishSeparatorIndex >= 0) {
    return {
      lead: paragraph.slice(0, englishSeparatorIndex + 2),
      sentence: paragraph.slice(englishSeparatorIndex + 2),
    };
  }

  return {
    lead: paragraph,
    sentence: null,
  };
}

function syncAboutDocumentMetadata(locale: Locale, description: string): () => void {
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

  document.title = 'PromptClip · About';
  document.documentElement.lang = htmlLangByLocale[locale];
  metaDescription.content = description;

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

export type { AboutPageContentProps };

export function AboutPageContent({ locale }: AboutPageContentProps) {
  const [pageLocale, setPageLocale] = useState<AboutPageLanguage>(() =>
    toAboutPageLanguage(locale)
  );
  const t = messages[pageLocale];
  const introParagraphs = t.settings.aboutIntroParagraphs;
  const introHighlight = splitIntroParagraph(introParagraphs[1] ?? '');
  const sections: AboutSectionData[] = [
    {
      title: t.settings.aboutFileTitle,
      paragraphs: t.settings.aboutFileParagraphs,
    },
    {
      title: t.settings.aboutLocalTitle,
      paragraphs: t.settings.aboutLocalParagraphs,
    },
  ];

  useEffect(() => {
    return syncAboutDocumentMetadata(pageLocale, t.settings.aboutDescription);
  }, [pageLocale, t.settings.aboutDescription]);

  return (
    <div className={pageClassName}>
      <main className={mainClassName}>
        <article className={articleClassName}>
          <nav className={navClassName} aria-label="About">
            <a href="/" className={homeLinkClassName}>
              <span className="material-symbols-outlined text-[17px] leading-none">
                arrow_back
              </span>
              <span>{aboutHomeLinkByLocale[pageLocale]}</span>
            </a>
            <div className={languageToggleClassName} aria-label="切换关于页面语言">
              <button
                type="button"
                className={getLanguageButtonClassName(pageLocale === 'zh-CN')}
                aria-pressed={pageLocale === 'zh-CN'}
                onClick={() => setPageLocale('zh-CN')}
              >
                中文
              </button>
              <button
                type="button"
                className={getLanguageButtonClassName(pageLocale === 'en-US')}
                aria-pressed={pageLocale === 'en-US'}
                onClick={() => setPageLocale('en-US')}
              >
                English
              </button>
            </div>
          </nav>
          <p className={kickerClassName}>About</p>

          <header>
            <h1 className={titleClassName}>{t.settings.aboutTitle}</h1>
            <p className={subtitleClassName}>{t.settings.aboutDescription}</p>
          </header>

          <div className="mt-9 border-t border-border pt-8 sm:mt-11 sm:pt-9">
            <p>{introParagraphs[0]}</p>
            <p className="mt-5">{introHighlight.lead}</p>
            {introHighlight.sentence && (
              <p className={introSentenceClassName}>{introHighlight.sentence}</p>
            )}
          </div>

          {sections.map((section, sectionIndex) => (
            <section
              key={section.title}
              className="mt-11 border-t border-border pt-7 sm:mt-14 sm:pt-8"
            >
              <h2 className={sectionTitleClassName}>{section.title}</h2>
              <div className="space-y-4 text-fg/90">
                {section.paragraphs.map((paragraph, paragraphIndex) => {
                  const isOwnershipLine =
                    sectionIndex === 1 && paragraphIndex === section.paragraphs.length - 1;

                  return (
                    <p
                      key={paragraph}
                      className={isOwnershipLine ? 'font-semibold text-fg' : undefined}
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}

          <p className={finalParagraphClassName}>{t.settings.aboutCommitment}</p>

          <p className="mt-12 font-mono text-xs leading-5 text-muted">{FOOTER_TEXT}</p>
          <a href="/privacy" className={privacyLinkClassName}>
            {aboutPrivacyLinkByLocale[pageLocale]}
          </a>
        </article>
      </main>
    </div>
  );
}

export function AboutPage() {
  const { locale } = useTranslation();

  return <AboutPageContent locale={locale} />;
}
