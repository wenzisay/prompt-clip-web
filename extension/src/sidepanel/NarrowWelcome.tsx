/**
 * 窄列欢迎页（未选择目录时显示）
 *
 * 精简自仓库根 WelcomeScreen：去掉宽屏 hero/双栏/客户端下载入口，
 * 保留核心——选择数据目录按钮 + 错误提示。复用 useDirectoryPicker（直调 picker，spike 已验证）。
 */
import { useDirectoryPicker } from '@/hooks/useDirectoryPicker';
import { useTranslation } from '@/i18n';

export function NarrowWelcome() {
  const { t } = useTranslation();
  const { isSupported, isLoading, error, pendingWorkspace, openDirectory } =
    useDirectoryPicker();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <div className="flex items-center gap-2 text-accent">
        <span className="material-symbols-outlined">auto_awesome</span>
        <span className="text-base font-bold text-fg">PromptClip</span>
      </div>

      <h1 className="text-lg font-bold leading-snug text-fg">{t.app.welcomeSubtitle}</h1>
      <p className="max-w-[260px] text-sm leading-relaxed text-muted">
        {t.app.welcomeDescription}
      </p>

      {!isSupported && (
        <div className="max-w-[280px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <strong>{t.app.unsupportedBrowserTitle}</strong> {t.app.unsupportedBrowserDescription}
        </div>
      )}

      {error && (
        <div className="max-w-[280px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={() => openDirectory()}
        disabled={isLoading || !isSupported}
        className="flex h-12 w-full max-w-[280px] items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className={`material-symbols-outlined text-xl ${isLoading ? 'animate-spin' : ''}`}>
          {isLoading ? 'refresh' : 'folder_open'}
        </span>
        <span>
          {isLoading
            ? t.app.loading
            : pendingWorkspace
              ? t.app.useLastDataDirectory
              : t.app.chooseDataDirectory}
        </span>
      </button>

      <p className="max-w-[280px] text-xs text-muted">{t.app.localOnlyNote}</p>
    </div>
  );
}
