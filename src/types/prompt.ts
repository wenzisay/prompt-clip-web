/**
 * Prompt 实体
 * 表示一个完整的 AI 提示词
 */
export interface Prompt {
  /** 唯一标识符，使用文件名或生成的 UUID */
  id: string;
  /** Prompt 标题 */
  title: string;
  /** Prompt 内容主体 */
  content: string;
  /** 标签列表，支持层级格式如 "计算机/Linux" */
  tags: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 最后修改时间 */
  updatedAt: Date;
  /** 复制次数统计 */
  copyCount: number;
  /** 是否已收藏/置顶 */
  pinned: boolean;
  /** 收藏时间 */
  pinnedAt?: Date;
  /** 相对工作区根目录的 Markdown 文件路径 */
  filePath: string;
}

/**
 * Prompt 创建参数
 */
export interface CreatePromptInput {
  title: string;
  content: string;
  tags: string[];
}

/**
 * Prompt 更新参数
 */
export interface UpdatePromptInput extends Partial<CreatePromptInput> {
  id: string;
  copyCount?: number;
  pinned?: boolean;
}

/**
 * Prompt 筛选条件
 */
export interface PromptFilter {
  /** 搜索关键词 */
  searchQuery?: string;
  /** 标签筛选 */
  tag?: string;
  /** 仅显示收藏 */
  favoritesOnly?: boolean;
  /** 仅显示最近修改 */
  recentOnly?: boolean;
}

/**
 * Prompt 元数据（从 frontmatter 解析）
 */
export interface PromptMetadata {
  title?: string;
  tags?: string[];
  created?: string;
  modified?: string;
  copyCount?: number;
  pinned?: boolean;
  pinnedAt?: string;
}
