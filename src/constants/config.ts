/**
 * 应用配置
 */

export const CONFIG = {
  /** 应用名称 */
  APP_NAME: 'PromptClip',
  /** 应用版本 */
  APP_VERSION: '1.0.0',

  /** 文件系统配置 */
  FILE_SYSTEM: {
    /** 支持的文件扩展名 */
    SUPPORTED_EXTENSIONS: ['.md'],
    /** 历史版本目录名 */
    HISTORY_DIR: '_promptclip/.history',
    /** 回收站目录名 */
    TRASH_DIR: '_promptclip/.trash',
    /** PromptClip 工作区数据目录名 */
    APP_DATA_DIR: '_promptclip',
    /** 工作区配置文件路径 */
    CONFIG_FILE: '_promptclip/promptclip.config.json',
    /** 批注 sidecar 目录名 */
    ANNOTATIONS_DIR: '_promptclip/annotations',
    /** 批注附件目录名 */
    ANNOTATION_ASSETS_DIR: '_promptclip/assets',
    /** 最大历史版本数 */
    MAX_HISTORY_VERSIONS: 10,
    /** 批注图片附件最大字节数 */
    MAX_ANNOTATION_IMAGE_BYTES: 5 * 1024 * 1024,
  },

  /** 性能配置 */
  PERFORMANCE: {
    /** 搜索防抖延迟（毫秒） */
    SEARCH_DEBOUNCE_MS: 300,
    /** 虚拟滚动每页项目数 */
    VIRTUAL_PAGE_SIZE: 50,
    /** 最大缓存项目数 */
    MAX_CACHE_SIZE: 1000,
  },

  /** UI 配置 */
  UI: {
    /** Toast 默认显示时长（毫秒） */
    TOAST_DURATION: 3000,
    /** 详情面板宽度 */
    DETAIL_PANEL_WIDTH: 480,
    /** 侧边栏宽度 */
    SIDEBAR_WIDTH: 260,
  },

  /** 历史记录配置 */
  HISTORY: {
    /** 最大最近记录数 */
    MAX_RECENT_ITEMS: 20,
  },
} as const;
