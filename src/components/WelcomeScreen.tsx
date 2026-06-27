/**
 * 欢迎界面
 *
 * 首次访问或未选择目录时显示
 */

import { useDirectoryPicker } from '@/hooks/useDirectoryPicker';
import { useTranslation } from '@/i18n';
import { isTauriRuntime } from '@/services/fileRepository/tauriFileRepository';

const FEATURE_CARD_CLASS_NAME =
  'min-h-[136px] self-start rounded-[14px] border border-white/75 bg-white/58 p-5 ' +
  'shadow-[0_18px_48px_rgba(76,84,140,0.09)] backdrop-blur';

interface FeatureCardData {
  icon: string;
  title: string;
  description: readonly string[];
  iconClass: string;
}

function FeatureCardContent({ feature }: { feature: FeatureCardData }) {
  return (
    <>
      <div className="flex items-start gap-5">
        <div
          className={
            `flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ` +
            feature.iconClass
          }
        >
          <span className="material-symbols-outlined text-[30px]">
            {feature.icon}
          </span>
        </div>
        <div className="pt-1">
          <h2 className="mb-2 text-[1.08rem] font-bold text-[#0b1235]">
            {feature.title}
          </h2>
          <p className="text-[0.9rem] font-medium leading-5 text-[#6d789b]">
            {feature.description.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
      <span className="material-symbols-outlined mt-4 block text-[24px] text-[#7b86ad]">
        arrow_forward
      </span>
    </>
  );
}

export function WelcomeScreen() {
  const { t } = useTranslation();
  const { isSupported, isLoading, error, openDirectory } = useDirectoryPicker();
  const shouldLinkFeatureCards = !isTauriRuntime();
  const featureCards: FeatureCardData[] = [
    {
      icon: 'lock',
      title: t.app.featureLocalTitle,
      description: t.app.featureLocalDescription,
      iconClass: 'bg-[#edf0ff] text-[#2f55f6]',
    },
    {
      icon: 'draft',
      title: t.app.featureFastTitle,
      description: t.app.featureFastDescription,
      iconClass: 'bg-[#f3e4ff] text-[#8f39eb]',
    },
    {
      icon: 'devices',
      title: t.app.featureMarkdownTitle,
      description: t.app.featureMarkdownDescription,
      iconClass: 'bg-[#fff0e9] text-[#f36b18]',
    },
  ];

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-[#f7f9ff] text-[#090f32]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(225,239,255,0.95),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(239,218,255,0.86),transparent_35%),radial-gradient(circle_at_88%_88%,rgba(232,224,255,0.75),transparent_34%)]" />
      <div className="pointer-events-none absolute -right-36 top-14 h-[620px] w-[620px] rounded-full bg-white/35" />
      <div className="pointer-events-none absolute -right-10 bottom-[-210px] h-[520px] w-[520px] rounded-full bg-white/45" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1224px] flex-col px-6 py-12 sm:px-10 lg:px-12">
        <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_0.96fr]">
          <div className="max-w-[520px]">
            <div className="mb-9 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#d9e2ff] bg-[#eef3ff]/65 px-3.5 py-2 text-sm font-semibold text-[#315bff] shadow-[0_8px_28px_rgba(55,85,190,0.08)] backdrop-blur sm:text-base">
              <span className="material-symbols-outlined text-[21px]">
                integration_instructions
              </span>
              <span>{t.app.welcomeBadgeOne}</span>
              <span className="text-[#4d6dff]">·</span>
              <span>{t.app.welcomeBadgeTwo}</span>
              <span className="text-[#4d6dff]">·</span>
              <span>{t.app.welcomeBadgeThree}</span>
            </div>

            <h1 className="mb-3 font-display text-[clamp(3.75rem,7vw,5.4rem)] font-black leading-[0.98] tracking-[0]">
              Prompt<span className="bg-gradient-to-r from-[#2554f4] via-[#5d69ff] to-[#a43cff] bg-clip-text text-transparent">Clip</span>
            </h1>
            <p className="mb-7 text-[clamp(1.7rem,3vw,2.25rem)] font-bold tracking-[0] text-[#617097]">
              {t.app.welcomeSubtitle}
            </p>
            <p className="mb-9 max-w-[485px] text-[1.06rem] leading-8 text-[#6a779c]">
              {t.app.welcomeDescription}
            </p>

            {!isSupported && (
              <div className="mb-4 max-w-[425px] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>{t.app.unsupportedBrowserTitle}</strong>{' '}
                {t.app.unsupportedBrowserDescription}
              </div>
            )}

            {error && (
              <div className="mb-4 max-w-[425px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={() => openDirectory()}
              disabled={isLoading || !isSupported}
              className="group flex h-[74px] w-full max-w-[425px] items-center justify-between rounded-[10px] bg-[#293cf4] px-8 text-[1.16rem] font-semibold text-white shadow-[0_20px_42px_rgba(41,60,244,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2134e7] focus:outline-none focus:ring-2 focus:ring-[#3147ff] focus:ring-offset-4 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`material-symbols-outlined text-[30px] ${isLoading ? 'animate-spin' : ''}`}>
                  {isLoading ? 'refresh' : 'folder_open'}
                </span>
                <span className="whitespace-nowrap">
                  {isLoading ? t.app.loading : t.app.chooseDataDirectory}
                </span>
              </span>
              <span className="material-symbols-outlined text-[28px] transition group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
            <p className="mt-5 text-[0.96rem] font-medium text-[#6d789b]">
              {t.app.localOnlyNote}
            </p>
          </div>

          <div className="relative hidden min-h-[430px] items-center justify-center lg:flex">
            <span className="absolute right-2 top-12 text-[36px] leading-none text-white">
              ✦
            </span>
            <span className="absolute -right-14 top-20 text-[31px] leading-none text-white">
              ✦
            </span>
            <span className="absolute bottom-12 left-4 h-24 w-24 rounded-full bg-white/55 blur-[1px]" />

            <div className="relative h-[385px] w-[430px]">
              <div className="absolute left-[138px] top-[80px] h-[148px] w-[260px] rotate-[8deg] rounded-2xl bg-gradient-to-br from-[#a69cff] to-[#6d7cff] opacity-80 shadow-[0_28px_60px_rgba(92,104,220,0.22)]" />
              <div className="absolute left-[78px] top-[118px] h-[202px] w-[322px] rounded-[22px] border border-white/70 bg-gradient-to-br from-white/42 via-[#eee8ff]/58 to-[#7890ff]/50 shadow-[0_30px_70px_rgba(79,87,178,0.22)] backdrop-blur-md" />
              <div className="absolute left-[116px] top-[64px] h-[126px] w-[255px] rotate-[7deg] rounded-[18px] bg-gradient-to-br from-[#aaa0ff] to-[#737df7] opacity-85 shadow-[0_20px_45px_rgba(94,91,205,0.2)]" />
              <div className="absolute left-[68px] top-[92px] h-[130px] w-[250px] rotate-[8deg] rounded-[18px] bg-white/78 shadow-[0_20px_48px_rgba(108,116,200,0.2)] backdrop-blur-md">
                <span className="absolute left-7 top-12 text-[46px] leading-none text-[#4d61f0]">
                  ✨
                </span>
                <span className="absolute left-[118px] top-[54px] h-4 w-[68px] rounded-full bg-[#b7aeff]" />
                <span className="absolute left-[116px] top-[78px] h-3.5 w-32 rounded-full bg-[#b7aeff]" />
                <span className="absolute left-[116px] top-[100px] h-3.5 w-28 rounded-full bg-[#b7aeff]" />
              </div>
              <div className="absolute bottom-4 left-[46px] h-[204px] w-[350px] rounded-[24px] border border-white/65 bg-gradient-to-br from-white/42 via-[#ddd7ff]/48 to-[#607bff]/62 shadow-[0_34px_65px_rgba(82,91,182,0.25),inset_0_1px_16px_rgba(255,255,255,0.6)] backdrop-blur-lg" />
              <span className="absolute bottom-[84px] left-[142px] text-[62px] leading-none text-white">
                ✦
              </span>
            </div>
          </div>
        </section>

        <div className="hidden items-start gap-6 pb-8 lg:grid lg:grid-cols-3">
          {featureCards.map((feature) => (
            shouldLinkFeatureCards ? (
              <a
                key={feature.title}
                href="/about"
                className={
                  `${FEATURE_CARD_CLASS_NAME} group transition hover:-translate-y-0.5 ` +
                  'hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#3147ff] ' +
                  'focus:ring-offset-4'
                }
              >
                <FeatureCardContent feature={feature} />
              </a>
            ) : (
              <article key={feature.title} className={FEATURE_CARD_CLASS_NAME}>
                <FeatureCardContent feature={feature} />
              </article>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
