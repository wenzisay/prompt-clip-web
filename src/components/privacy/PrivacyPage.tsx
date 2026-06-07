import { useEffect, useState } from 'react';

type PrivacyLanguage = 'zh' | 'en';

interface PrivacySection {
  title: string;
  paragraphs: readonly string[];
  items?: readonly string[];
  afterItems?: readonly string[];
}

interface PrivacyCopy {
  htmlLang: string;
  pageTitle: string;
  metaDescription: string;
  backHome: string;
  languageLabel: string;
  title: string;
  subtitle: string;
  updated: string;
  lead: string;
  principle: string;
  principleStrong: string;
  intro: string;
  sections: readonly PrivacySection[];
  contactIntro: string;
  contactLabel: string;
  footer: string;
}

export interface PrivacyPageContentProps {
  initialLanguage?: PrivacyLanguage;
}

const contactEmail = 'wenziii@outlook.com';

const privacyCopyByLanguage: Record<PrivacyLanguage, PrivacyCopy> = {
  zh: {
    htmlLang: 'zh-Hans',
    pageTitle: 'PromptClip 隐私政策',
    metaDescription: 'PromptClip 隐私政策：本地优先，文件属于你。',
    backHome: '返回首页',
    languageLabel: '切换隐私政策语言',
    title: '隐私政策',
    subtitle: '本地优先，文件属于你。',
    updated: '最后更新：2026 年 6 月 7 日',
    lead:
      'PromptClip 是一款为 AI 时代构建的个人 Prompt 工作空间。我们特别重视您的隐私，也尊重您对自己内容的控制权。',
    principle: 'PromptClip 的核心原则是：',
    principleStrong: '本地优先，文件属于你。',
    intro:
      '你的 Prompt、笔记、工作流和相关内容，默认存储在你选择的本地文件夹或 iCloud 文件夹中。我们不会主动收集、上传、出售或共享你的个人内容。',
    sections: [
      {
        title: '1. 我们如何存储你的内容',
        paragraphs: [
          'PromptClip 使用开放的 Markdown 文件保存你的内容。',
          '这些文件存储在你选择的位置，例如：',
        ],
        items: ['设备本地文件夹', 'iCloud Drive 文件夹', '其他由你自行选择的文件夹'],
        afterItems: [
          'PromptClip 不会将你的 Prompt、笔记或工作空间内容上传到我们自己的服务器。',
          '如果你选择将工作目录放在 iCloud Drive 中，文件同步由 Apple 的 iCloud 服务完成。PromptClip 只是读写你授权选择的文件夹，不控制 iCloud 的同步过程。',
        ],
      },
      {
        title: '2. 我们收集哪些信息',
        paragraphs: [
          'PromptClip 当前未提供账号注册功能，也不会主动收集你的个人身份信息。',
          'PromptClip 可能会在你的设备本地保存以下信息：',
        ],
        items: [
          '应用设置',
          '最近打开的工作目录',
          '界面偏好',
          '本地索引或缓存数据',
          '收藏、标签、排序等本地状态',
        ],
        afterItems: [
          '这些信息主要用于让应用正常运行，并改善你的使用体验。这些数据均存储在设备本地，PromptClip 不会将这些信息发送给我们。',
        ],
      },
      {
        title: '3. 关于你的 Prompt 和笔记内容',
        paragraphs: [
          '你的 Prompt、笔记、批注、标签和工作流内容属于你。',
          '我们不会：',
        ],
        items: [
          '查看你的个人内容',
          '将你的内容上传到我们的服务器',
          '出售你的内容',
          '使用你的内容训练 AI 模型',
          '与第三方共享你的内容',
        ],
        afterItems: [
          '如果未来 PromptClip 增加需要联网或云端处理的功能，我们会在功能启用前向你说明数据的使用方式，并尽量提供明确的选择权。',
        ],
      },
      {
        title: '4. iCloud 与第三方同步',
        paragraphs: [
          'PromptClip 支持你选择 iCloud Drive 文件夹作为工作目录。',
          '当你这样做时，你的文件可能会通过 Apple 的 iCloud 在你的设备之间同步。该同步行为由 Apple 提供和管理，PromptClip 不会访问你的 Apple ID，也无法查看你的 iCloud 账号信息。',
          '如果你使用其他第三方同步工具，例如 Dropbox、OneDrive、坚果云或 Git，同步过程由对应服务提供商负责。PromptClip 只负责读写你授权的本地文件夹。',
        ],
      },
      {
        title: '5. 分析、崩溃日志与诊断信息',
        paragraphs: [
          'PromptClip 当前不会主动收集使用分析数据，也不会上传崩溃日志到我们自己的服务器。',
          '如果应用发生崩溃，Apple 可能会根据你的系统设置向开发者提供匿名或聚合的崩溃诊断信息。此类信息由 Apple 系统机制提供，通常不包含你的 Prompt 或笔记内容。',
          '如果未来我们接入崩溃分析或使用统计服务，我们会更新本隐私政策，并在必要时提供相应说明。',
        ],
      },
      {
        title: '6. 内购与订阅',
        paragraphs: [
          'PromptClip 当前暂无内购或订阅功能。',
          '如果将来 PromptClip 提供内购或订阅功能，相关购买流程由 Apple App Store 处理。',
          '我们不会直接获取你的银行卡号、支付账号或完整付款信息。Apple 可能会向开发者提供与购买状态相关的信息，例如订阅是否有效、购买项目类型等，用于解锁高级功能。',
        ],
      },
      {
        title: '7. AI 服务与外部接口',
        paragraphs: [
          'PromptClip 的核心功能不依赖云端 API 服务。',
          '如果将来 PromptClip 集成了第三方 API 服务，并且你主动使用需要连接第三方 AI 服务的功能，例如将内容发送给 AI 模型进行处理、总结、改写或生成，我们会在相关功能中明确说明数据会被发送到对应服务。',
          '在这种情况下，第三方 AI 服务对数据的处理将受其自身隐私政策约束。请在使用前确认你理解并同意相关数据处理方式。',
          '如果你没有主动使用这些联网 API 功能，PromptClip 不会自动将你的内容发送给 API 服务。',
        ],
      },
      {
        title: '8. 数据删除',
        paragraphs: [
          '由于 PromptClip 采用文件优先的方式存储内容，你可以通过以下方式删除你的数据：',
        ],
        items: [
          '在 PromptClip 中删除对应内容',
          '在文件管理器中删除对应 Markdown 文件',
          '删除整个 PromptClip 工作目录',
          '删除应用本身',
          '从 iCloud Drive 或其他同步服务中删除相关文件',
        ],
        afterItems: [
          '请注意，如果你使用 iCloud 或其他第三方同步服务，删除数据后是否会同步删除到其他设备，取决于对应同步服务的规则。',
        ],
      },
      {
        title: '9. 儿童隐私',
        paragraphs: [
          'PromptClip 面向一般用户提供效率与内容管理工具。我们不会有意收集儿童的个人信息。',
          '如果你认为我们在不知情的情况下收集了儿童的个人信息，可以通过本页面提供的联系方式与我们联系。',
        ],
      },
      {
        title: '10. 隐私政策更新',
        paragraphs: [
          '我们可能会根据产品功能、法律要求或服务变化更新本隐私政策。',
          '当隐私政策发生重要变化时，我们会在应用内或官网上提供更新后的版本，并修改页面顶部的“最后更新”日期。',
        ],
      },
    ],
    contactIntro: '如果你对本隐私政策或数据处理方式有任何问题，可以通过以下方式联系我们：',
    contactLabel: '邮箱：',
    footer: '© PromptClip. All rights reserved.',
  },
  en: {
    htmlLang: 'en',
    pageTitle: 'PromptClip Privacy Policy',
    metaDescription: 'PromptClip Privacy Policy: local-first, and your files belong to you.',
    backHome: 'Back home',
    languageLabel: 'Switch privacy policy language',
    title: 'Privacy Policy',
    subtitle: 'Local-first. Your files belong to you.',
    updated: 'Last updated: June 7, 2026',
    lead:
      'PromptClip is a personal prompt workspace built for the AI era. We care deeply about your privacy and respect your control over your content.',
    principle: 'PromptClip is built on one core principle: ',
    principleStrong: 'local-first, and your files belong to you.',
    intro:
      'Your prompts, notes, workflows, and related content are stored by default in the local folder or iCloud folder you choose. We do not actively collect, upload, sell, or share your personal content.',
    sections: [
      {
        title: '1. How we store your content',
        paragraphs: [
          'PromptClip stores your content as open Markdown files.',
          'Those files are stored wherever you choose, such as:',
        ],
        items: ['A local folder on your device', 'An iCloud Drive folder', 'Any other folder you choose'],
        afterItems: [
          'PromptClip does not upload your prompts, notes, or workspace content to our own servers.',
          'If you place your workspace in iCloud Drive, file sync is handled by Apple iCloud. PromptClip only reads and writes the folder you authorize; it does not control iCloud sync.',
        ],
      },
      {
        title: '2. Information we collect',
        paragraphs: [
          'PromptClip currently does not provide account registration and does not actively collect personal identity information.',
          'PromptClip may save the following information locally on your device:',
        ],
        items: [
          'App settings',
          'Recently opened workspaces',
          'Interface preferences',
          'Local indexes or cache data',
          'Local state such as favorites, tags, and sorting',
        ],
        afterItems: [
          'This information is used to keep the app working and improve your experience. It remains on your device, and PromptClip does not send it to us.',
        ],
      },
      {
        title: '3. Your prompts and notes',
        paragraphs: [
          'Your prompts, notes, annotations, tags, and workflows belong to you.',
          'We do not:',
        ],
        items: [
          'View your personal content',
          'Upload your content to our servers',
          'Sell your content',
          'Use your content to train AI models',
          'Share your content with third parties',
        ],
        afterItems: [
          'If PromptClip adds online or cloud processing features in the future, we will explain how data is used before the feature is enabled and provide clear choices where possible.',
        ],
      },
      {
        title: '4. iCloud and third-party sync',
        paragraphs: [
          'PromptClip lets you choose an iCloud Drive folder as your workspace.',
          'When you do this, your files may sync between devices through Apple iCloud. That sync is provided and managed by Apple. PromptClip does not access your Apple ID and cannot view your iCloud account information.',
          'If you use another third-party sync tool, such as Dropbox, OneDrive, Nutstore, or Git, the sync process is handled by that provider. PromptClip only reads and writes the local folder you authorize.',
        ],
      },
      {
        title: '5. Analytics, crash logs, and diagnostics',
        paragraphs: [
          'PromptClip currently does not actively collect usage analytics and does not upload crash logs to our own servers.',
          'If the app crashes, Apple may provide developers with anonymous or aggregated crash diagnostics depending on your system settings. This information is provided by Apple system mechanisms and usually does not include your prompts or notes.',
          'If we add crash analytics or usage statistics in the future, we will update this privacy policy and provide relevant explanations where needed.',
        ],
      },
      {
        title: '6. In-app purchases and subscriptions',
        paragraphs: [
          'PromptClip currently does not offer in-app purchases or subscriptions.',
          'If PromptClip offers in-app purchases or subscriptions in the future, the purchase flow will be handled by the Apple App Store.',
          'We will not directly receive your card number, payment account, or complete payment information. Apple may provide developers with purchase status information, such as whether a subscription is active or the type of item purchased, to unlock premium features.',
        ],
      },
      {
        title: '7. AI services and external APIs',
        paragraphs: [
          'PromptClip core features do not depend on cloud API services.',
          'If PromptClip integrates third-party API services in the future, and you actively use a feature that connects to a third-party AI service, such as sending content to an AI model for processing, summarizing, rewriting, or generation, we will clearly explain that the relevant data will be sent to that service.',
          'In that case, the third-party AI service will process data under its own privacy policy. Please make sure you understand and agree to those terms before using the feature.',
          'If you do not actively use these online API features, PromptClip will not automatically send your content to API services.',
        ],
      },
      {
        title: '8. Data deletion',
        paragraphs: [
          'Because PromptClip stores content file-first, you can delete your data in the following ways:',
        ],
        items: [
          'Delete the relevant content in PromptClip',
          'Delete the relevant Markdown files in your file manager',
          'Delete the entire PromptClip workspace',
          'Delete the app itself',
          'Delete related files from iCloud Drive or another sync service',
        ],
        afterItems: [
          'If you use iCloud or another third-party sync service, whether deletion syncs to other devices depends on that service’s rules.',
        ],
      },
      {
        title: '9. Children’s privacy',
        paragraphs: [
          'PromptClip is a productivity and content management tool for general users. We do not knowingly collect personal information from children.',
          'If you believe we have unknowingly collected personal information from a child, you can contact us using the information on this page.',
        ],
      },
      {
        title: '10. Privacy policy updates',
        paragraphs: [
          'We may update this privacy policy based on product features, legal requirements, or service changes.',
          'When material changes are made, we will provide the updated version in the app or on the official website and update the “Last updated” date at the top of this page.',
        ],
      },
    ],
    contactIntro: 'If you have any questions about this privacy policy or how data is handled, contact us:',
    contactLabel: 'Email: ',
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

function getLanguageButtonClassName(isActive: boolean): string {
  if (isActive) {
    return `${languageButtonClassName} bg-accent text-white shadow-card`;
  }

  return `${languageButtonClassName} text-muted hover:text-fg`;
}

function syncPrivacyDocumentMetadata(copy: PrivacyCopy): () => void {
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

function renderParagraphs(paragraphs: readonly string[]) {
  return paragraphs.map((paragraph) => (
    <p key={paragraph} className="mt-4">
      {paragraph}
    </p>
  ));
}

export function PrivacyPageContent({ initialLanguage = 'zh' }: PrivacyPageContentProps) {
  const [language, setLanguage] = useState<PrivacyLanguage>(initialLanguage);
  const copy = privacyCopyByLanguage[language];

  useEffect(() => {
    return syncPrivacyDocumentMetadata(copy);
  }, [copy]);

  return (
    <div className={pageClassName}>
      <main className={mainClassName}>
        <article className={articleClassName}>
          <nav className={navClassName} aria-label="Privacy">
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
                onClick={() => setLanguage('zh')}
              >
                中文
              </button>
              <button
                type="button"
                className={getLanguageButtonClassName(language === 'en')}
                aria-pressed={language === 'en'}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
            </div>
          </nav>

          <header className="border-b border-border pb-8">
            <h1 className={titleClassName}>{copy.title}</h1>
            <p className="mt-3 font-display text-lg font-semibold leading-7 text-fg">
              {copy.subtitle}
            </p>
            <p className="mt-4 text-sm text-muted">{copy.updated}</p>
          </header>

          <div className="pt-8">
            <p className="text-lg font-medium leading-8 text-fg">{copy.lead}</p>
            <p className="mt-5">
              {copy.principle}
              <strong>{copy.principleStrong}</strong>
            </p>
            <p className="mt-4">{copy.intro}</p>
          </div>

          {copy.sections.map((section) => (
            <section key={section.title} className="mt-10 border-t border-border pt-8">
              <h2 className="font-display text-xl font-semibold leading-7 tracking-[0] text-fg">
                {section.title}
              </h2>
              <div className="text-fg/90">
                {renderParagraphs(section.paragraphs)}
                {section.items && (
                  <ul className="mt-4 list-disc space-y-2 pl-6">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.afterItems && renderParagraphs(section.afterItems)}
              </div>
            </section>
          ))}

          <section className="mt-10 border-t border-border pt-8">
            <h2 className="font-display text-xl font-semibold leading-7 tracking-[0] text-fg">
              {language === 'zh' ? '11. 联系我们' : '11. Contact us'}
            </h2>
            <div className="mt-5 border border-border bg-surfaceDim px-5 py-4">
              <p>{copy.contactIntro}</p>
              <p className="mt-3">
                {copy.contactLabel}
                <a className="font-medium text-accent underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
              </p>
            </div>
          </section>

          <footer className="mt-12 border-t border-border pt-7 text-sm text-muted">
            {copy.footer}
          </footer>
        </article>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return <PrivacyPageContent initialLanguage="zh" />;
}
