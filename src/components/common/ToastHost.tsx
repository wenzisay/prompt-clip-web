/**
 * 全局轻提示宿主，消费 useUIStore 中的 toasts 队列。
 */

import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';

export function ToastHost() {
  const { t } = useTranslation();
  const toasts = useUIStore((state) => state.toasts);
  const removeToast = useUIStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        const containerClass = isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isSuccess
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-border bg-surface text-fg';
        const iconClass = isError
          ? 'text-red-600'
          : isSuccess
            ? 'text-emerald-600'
            : 'text-accent';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-card-hover ${containerClass}`}
          >
            {isError ? (
              <span
                className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] ${iconClass}`}
                aria-hidden="true"
              >
                error
              </span>
            ) : isSuccess ? (
              <span
                className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] ${iconClass}`}
                aria-hidden="true"
              >
                check
              </span>
            ) : (
              <span
                className={`material-symbols-outlined mt-0.5 shrink-0 text-[18px] ${iconClass}`}
                aria-hidden="true"
              >
                info
              </span>
            )}
            <p className="min-w-0 flex-1 whitespace-pre-line break-words leading-5">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label={t.skills.close}
              className="-mr-1 -mt-0.5 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
