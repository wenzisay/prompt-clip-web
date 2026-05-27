import { useSettingsStore } from '@/stores/settingsStore';
import { messages } from './messages';

export function useTranslation() {
  const locale = useSettingsStore((state) => state.locale);

  return {
    locale,
    t: messages[locale],
  };
}
