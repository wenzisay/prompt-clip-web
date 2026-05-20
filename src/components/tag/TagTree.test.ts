import { describe, expect, it } from 'vitest';
import { isTagTreeNodeActive, type TagTreeNodeScope } from './TagTree';

describe('TagTree active node state', () => {
  it('only highlights the clicked scope when a pinned tag also appears in all tags', () => {
    const activeScope: TagTreeNodeScope = 'pinned';

    expect(isTagTreeNodeActive('计算机', activeScope, '计算机', 'pinned')).toBe(true);
    expect(isTagTreeNodeActive('计算机', activeScope, '计算机', 'all')).toBe(false);
  });

  it('highlights all-tags scope for external tag filters without sidebar click scope', () => {
    expect(isTagTreeNodeActive('计算机', null, '计算机', 'all')).toBe(true);
    expect(isTagTreeNodeActive('计算机', null, '计算机', 'pinned')).toBe(false);
  });
});
