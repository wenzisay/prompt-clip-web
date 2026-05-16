/**
 * 标签服务
 *
 * 处理标签解析、层级组织、颜色分配等功能
 */

import type { TagTreeNode, TagColor, TagStats } from '@/types/tag';

/** 标签层级分隔符 */
const TAG_SEPARATOR = '/';

/** 标签颜色映射（基于标签名哈希） */
const TAG_COLOR_MAP: Record<string, TagColor> = {};

/**
 * 解析标签字符串（支持 "计算机/Linux" 格式）
 */
export function parseTag(tagString: string): {
  name: string;
  path: string[];
} {
  const path = tagString.split(TAG_SEPARATOR).filter(Boolean);
  return {
    name: path[path.length - 1] || tagString,
    path,
  };
}

/**
 * 获取标签的显示名称（不含路径）
 */
export function getTagDisplayName(tag: string): string {
  const parts = tag.split(TAG_SEPARATOR);
  return parts[parts.length - 1] || tag;
}

/**
 * 获取标签父级路径
 */
export function getTagParentPath(tag: string): string | null {
  const parts = tag.split(TAG_SEPARATOR);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(TAG_SEPARATOR);
}

/**
 * 获取标签层级深度
 */
export function getTagDepth(tag: string): number {
  return tag.split(TAG_SEPARATOR).length;
}

/**
 * 规范化标签路径
 */
export function normalizeTagPath(tag: string): string {
  return tag
    .trim()
    .replace(/^#/, '')
    .split(TAG_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(TAG_SEPARATOR);
}

/**
 * 判断 candidate 是否命中 target 标签或其子标签
 */
export function isTagMatch(candidate: string, target: string): boolean {
  return candidate === target || candidate.startsWith(`${target}${TAG_SEPARATOR}`);
}

/**
 * 重命名单个 tags 数组中的标签路径
 */
export function renameTagsInList(tags: string[], oldTag: string, newTag: string): string[] {
  const normalizedOldTag = normalizeTagPath(oldTag);
  const normalizedNewTag = normalizeTagPath(newTag);

  if (!normalizedOldTag || !normalizedNewTag || normalizedOldTag === normalizedNewTag) {
    return tags;
  }

  const renamed = tags.map((tag) => {
    if (!isTagMatch(tag, normalizedOldTag)) return tag;
    return `${normalizedNewTag}${tag.slice(normalizedOldTag.length)}`;
  });

  return Array.from(new Set(renamed));
}

/**
 * 从 tags 数组中删除标签及其子标签
 */
export function removeTagFromList(tags: string[], tagToRemove: string): string[] {
  const normalizedTag = normalizeTagPath(tagToRemove);
  if (!normalizedTag) return tags;

  return tags.filter((tag) => !isTagMatch(tag, normalizedTag));
}

/**
 * 构建标签树
 * 将扁平的标签列表转换为层级树结构
 */
export function buildTagTree(tags: string[]): TagTreeNode[] {
  const rootNodes: Map<string, TagTreeNode> = new Map();
  const tagCounts = new Map<string, number>();

  // 统计每个标签的出现次数
  for (const tag of tags) {
    const parts = tag.split(TAG_SEPARATOR).filter(Boolean);

    // 统计完整路径和所有父级路径，父标签显示其子树总数
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      tagCounts.set(currentPath, (tagCounts.get(currentPath) || 0) + 1);
      rootNodes.set(currentPath, createTagNode(currentPath, tagCounts));
    }
  }

  // 构建树结构
  const tree: TagTreeNode[] = [];
  const processed = new Set<string>();

  for (const [name, node] of rootNodes) {
    if (processed.has(name)) continue;

    const parentPath = getTagParentPath(name);
    if (!parentPath) {
      tree.push(node);
      processed.add(name);
    } else {
      const parent = rootNodes.get(parentPath);
      if (parent) {
        parent.children.push(node);
        parent.hasChildren = true;
        processed.add(name);
      }
    }
  }

  // 按名称排序
  return sortTagTree(tree);
}

/**
 * 创建标签节点
 */
function createTagNode(
  name: string,
  tagCounts: Map<string, number>
): TagTreeNode {
  const count = tagCounts.get(name) || 0;
  return {
    name,
    displayName: getTagDisplayName(name),
    count,
    hasChildren: false,
    pinned: false,
    children: [],
    depth: getTagDepth(name),
    expanded: false,
  };
}

/**
 * 排序标签树
 */
function sortTagTree(tree: TagTreeNode[]): TagTreeNode[] {
  return tree
    .sort((a, b) => {
      // 置顶标签排前面
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // 按名称排序
      return a.displayName.localeCompare(b.displayName, 'zh-CN');
    })
    .map(node => ({
      ...node,
      children: sortTagTree(node.children),
    }));
}

/**
 * 分配标签颜色
 * 基于标签名哈希，确保相同标签总是获得相同颜色
 */
export function getTagColor(tag: string): TagColor {
  if (TAG_COLOR_MAP[tag]) {
    return TAG_COLOR_MAP[tag];
  }

  // 基于标签名计算哈希值
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash; // 转换为32位整数
  }

  const colors: TagColor[] = ['blue', 'purple', 'violet', 'gray'];
  const color = colors[Math.abs(hash) % colors.length];

  TAG_COLOR_MAP[tag] = color;
  return color;
}

/**
 * 按标签筛选 Prompts
 */
export function filterByTag(
  tag: string,
  prompts: Array<{ tags: string[] }>
): Array<{ tags: string[] }> {
  return prompts.filter(prompt =>
    prompt.tags.some(t => t === tag || t.startsWith(`${tag}/`))
  );
}

/**
 * 获取标签统计信息
 */
export function getTagStats(
  prompts: Array<{ tags: string[] }>
): TagStats[] {
  const stats = new Map<string, number>();

  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      stats.set(tag, (stats.get(tag) || 0) + 1);
    }
  }

  return Array.from(stats.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取所有唯一标签
 */
export function getUniqueTags(
  prompts: Array<{ tags: string[] }>
): string[] {
  const tagSet = new Set<string>();

  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * 展开标签树中的所有标签名（扁平化）
 */
export function flattenTagTree(tree: TagTreeNode[]): string[] {
  const result: string[] = [];

  function traverse(nodes: TagTreeNode[]) {
    for (const node of nodes) {
      result.push(node.name);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return result;
}

/**
 * 切换标签树的展开状态
 */
export function toggleTagExpansion(
  tree: TagTreeNode[],
  tagName: string
): TagTreeNode[] {
  return expandTagTree(tree, tagName, null);
}

/**
 * 展开标签树中的特定节点
 */
export function expandTagTree(
  tree: TagTreeNode[],
  targetTag: string,
  expand: boolean | null
): TagTreeNode[] {
  return tree.map(node => {
    if (node.name === targetTag) {
      const expanded = expand === null ? !node.expanded : expand;
      const updated = { ...node, expanded };

      // 折叠时也折叠所有子节点
      if (!expanded) {
        updated.children = collapseAllChildren(node.children);
      }

      return updated;
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: expandTagTree(node.children, targetTag, expand),
      };
    }

    return node;
  });
}

/**
 * 折叠所有子节点
 */
function collapseAllChildren(children: TagTreeNode[]): TagTreeNode[] {
  return children.map(child => ({
    ...child,
    expanded: false,
    children: collapseAllChildren(child.children),
  }));
}

/**
 * 切换标签置顶状态
 */
export function toggleTagPin(
  tree: TagTreeNode[],
  tagName: string
): TagTreeNode[] {
  return tree.map(node => {
    if (node.name === tagName) {
      return { ...node, pinned: !node.pinned };
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: toggleTagPin(node.children, tagName),
      };
    }

    return node;
  });
}

/**
 * 导出 TagService
 */
export const TagService = {
  parseTag,
  getTagDisplayName,
  getTagParentPath,
  getTagDepth,
  buildTagTree,
  getTagColor,
  filterByTag,
  getTagStats,
  getUniqueTags,
  flattenTagTree,
  toggleTagExpansion,
  toggleTagPin,
  normalizeTagPath,
  isTagMatch,
  renameTagsInList,
  removeTagFromList,
} as const;
