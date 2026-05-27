/**
 * 列表页筛选项
 */

import { usePromptStore } from '@/stores/promptStore';
import { useUIStore } from '@/stores/uiStore';
import { TagService } from '@/services/tagService';
import { useTranslation } from '@/i18n';

type FilterTab = 'all' | 'recent' | 'favorites';

const FILTER_TABS: Array<{ value: FilterTab; labelKey: 'all' | 'recent' | 'favorites' }> = [
  { value: 'all', labelKey: 'all' },
  { value: 'recent', labelKey: 'recent' },
  { value: 'favorites', labelKey: 'favorites' },
];

export function FilterTabs() {
  const { t } = useTranslation();
  const { filter, setFilter } = usePromptStore();
  const { clearSelection } = useUIStore();
  const selectedTag = filter.tag;

  const activeTab: FilterTab = filter.favoritesOnly
    ? 'favorites'
    : filter.recentOnly
      ? 'recent'
      : 'all';

  const handleFilterChange = (newFilter: FilterTab) => {
    clearSelection();
    setFilter({
      favoritesOnly: newFilter === 'favorites',
      recentOnly: newFilter === 'recent',
      tag: undefined,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {FILTER_TABS.map((tab) => {
        const isActive = !selectedTag && activeTab === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`
              h-9 min-w-[58px] rounded-full px-4 text-sm font-semibold transition-colors
              ${
                isActive
                  ? 'bg-accent text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)]'
                  : 'bg-surface-high text-muted hover:bg-surface-container hover:text-fg'
              }
            `}
          >
            {t.app[tab.labelKey]}
          </button>
        );
      })}

      {selectedTag && (
        <div
          className="h-9 max-w-[220px] rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,88,188,0.12)] inline-flex items-center gap-1.5"
          title={selectedTag}
        >
          <span className="material-symbols-outlined text-base">sell</span>
          <span className="truncate">
            {TagService.getTagDisplayName(selectedTag)}
          </span>
        </div>
      )}
    </div>
  );
}
