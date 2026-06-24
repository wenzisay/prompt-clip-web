import type { ShareImageOptions, ShareTemplate } from '@/types/share';

export const SHARE_CARD_WIDTH = 800;
export const SHARE_CONTENT_CHARACTER_LIMIT = 2000;

export const DEFAULT_SHARE_IMAGE_OPTIONS: ShareImageOptions = {
  showAuthor: true,
  showLogo: true,
  showTags: true,
  renderMarkdown: true,
  includeAnnotations: false,
  selectedAnnotationIds: [],
};

export const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'minimal',
    name: '极简白',
    description: '干净留白，适合长文本阅读',
    previewClassName: 'bg-[#f5f5f4]',
    cardClassName: 'bg-white text-stone-800 shadow-[0_24px_80px_rgba(15,23,42,0.12)]',
    titleClassName: 'text-stone-900',
    contentClassName: 'text-stone-700',
    tagClassName: 'bg-stone-100 text-stone-500',
    logoClassName: 'opacity-55',
  },
  {
    id: 'dark',
    name: '深色',
    description: '高对比展示，适合短句分享',
    previewClassName: 'bg-[#111827]',
    cardClassName: 'bg-[#171717] text-stone-100 shadow-[0_24px_80px_rgba(0,0,0,0.28)]',
    titleClassName: 'text-white',
    contentClassName: 'text-stone-200',
    tagClassName: 'bg-white/10 text-stone-200',
    logoClassName: 'opacity-70 invert',
  },
  {
    id: 'pastel',
    name: '淡彩边框',
    description: '柔和边框，适合结构化笔记',
    previewClassName: 'bg-[#eef6f1]',
    cardClassName:
      'bg-[#fffdf8] text-stone-800 border border-emerald-100 shadow-[0_24px_80px_rgba(16,185,129,0.14)]',
    titleClassName: 'text-emerald-950',
    contentClassName: 'text-stone-700',
    tagClassName: 'bg-emerald-50 text-emerald-700',
    logoClassName: 'opacity-55',
  },
];

export function getShareTemplate(id: string): ShareTemplate {
  return SHARE_TEMPLATES.find((template) => template.id === id) ?? SHARE_TEMPLATES[0];
}
