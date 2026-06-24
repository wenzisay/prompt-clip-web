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
  /** 是否在分享图中包含批注区块 */
  includeAnnotations: boolean;
  /** 选中包含的批注 ID（顺序无关，渲染时保持批注原始顺序） */
  selectedAnnotationIds: string[];
}
