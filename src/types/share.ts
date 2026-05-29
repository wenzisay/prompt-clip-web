/**
 * 分享图片相关类型
 */

export type ShareTemplateId = 'minimal' | 'dark' | 'pastel';

export interface ShareTemplate {
  id: ShareTemplateId;
  name: string;
  description: string;
  previewClassName: string;
  cardClassName: string;
  titleClassName: string;
  contentClassName: string;
  tagClassName: string;
  logoClassName: string;
}

export interface ShareImageOptions {
  showAuthor: boolean;
  showLogo: boolean;
  showTags: boolean;
  renderMarkdown: boolean;
}
