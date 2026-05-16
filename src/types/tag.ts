/**
 * 标签颜色选项
 */
export type TagColor = 'blue' | 'purple' | 'violet' | 'gray';

/**
 * 标签节点
 */
export interface Tag {
  /** 标签名称，可能包含层级分隔符 "/" */
  name: string;
  /** 显示名称（不含层级分隔符） */
  displayName: string;
  /** 该标签下的 Prompt 数量 */
  count: number;
  /** 是否为父标签（有子标签） */
  hasChildren: boolean;
  /** 是否被置顶 */
  pinned: boolean;
}

/**
 * 标签树节点
 */
export interface TagTreeNode extends Tag {
  /** 子标签列表 */
  children: TagTreeNode[];
  /** 层级深度 */
  depth: number;
  /** 是否展开 */
  expanded: boolean;
}

/**
 * 标签统计信息
 */
export interface TagStats {
  /** 标签名称 */
  tag: string;
  /** 关联的 Prompt 数量 */
  count: number;
}
