/**
 * Prompt 实体
 * 表示一个完整的 AI 提示词
 */
export interface Prompt {
  /** 唯一标识符，使用文件名或生成的 UUID */
  id: string;
  /** Prompt 标题 */
  title: string;
  /** Prompt 内容主体；若 isContentLoaded=false，则为空串，需要先调用 ensureContent */
  content: string;
  /** 卡片预览（4 行 / 120 字符以内），首屏即填充，独立于 content */
  preview: string;
  /** content 是否已加载完整正文；首屏 head-only 加载时为 false */
  isContentLoaded: boolean;
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
  /** 是否为迁移失败时临时使用的旧路径 ID */
  isTemporaryLegacyId?: boolean;
}

/**
 * Prompt 历史版本
 */
export interface HistoryVersion {
  /** 历史文件名 */
  filename: string;
  /** 兼容旧调用方的历史文件时间 */
  date: Date;
  /** 历史版本编辑时间 */
  editedAt: Date;
  /** 历史版本标题 */
  title: string;
  /** 历史版本正文 */
  content: string;
  /** 历史版本标签 */
  tags: string[];
  /** 历史版本创建时间 */
  createdAt?: Date;
  /** 历史版本复制次数 */
  copyCount: number;
  /** 历史版本是否收藏 */
  pinned: boolean;
  /** 历史版本收藏时间 */
  pinnedAt?: Date;
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
  createdAt?: Date;
  copyCount?: number;
  pinned?: boolean;
  pinnedAt?: Date;
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
  id?: string;
  title?: string;
  tags?: string[];
  created?: string;
  modified?: string;
  copyCount?: number;
  pinned?: boolean;
  pinnedAt?: string;
}
