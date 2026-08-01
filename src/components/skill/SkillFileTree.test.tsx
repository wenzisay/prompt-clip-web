import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillFileEntry } from '@/types/skill';
import { SkillFileTree, ROOT_PATH } from './SkillFileTree';

const entries: SkillFileEntry[] = [
  {
    name: 'SKILL.md',
    relativePath: 'SKILL.md',
    isDirectory: false,
    isText: true,
    isMarkdown: true,
    size: 20,
    modifiedAtMs: 1,
    children: [],
  },
  {
    name: 'references',
    relativePath: 'references',
    isDirectory: true,
    isText: false,
    isMarkdown: false,
    size: 0,
    modifiedAtMs: 1,
    children: [
      {
        name: 'notes.txt',
        relativePath: 'references/notes.txt',
        isDirectory: false,
        isText: true,
        isMarkdown: false,
        size: 5,
        modifiedAtMs: 1,
        children: [],
      },
    ],
  },
];

function renderTree(overrides: Partial<React.ComponentProps<typeof SkillFileTree>> = {}) {
  const handlers = {
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onContextMenu: vi.fn(),
  };
  const utils = render(
    <SkillFileTree
      entries={entries}
      skillName="demo-skill"
      selectedPath={null}
      collapsedPaths={new Set()}
      onToggle={handlers.onToggle}
      onSelect={handlers.onSelect}
      onContextMenu={handlers.onContextMenu}
      {...overrides}
    />,
  );
  return { ...handlers, ...utils };
}

describe('SkillFileTree', () => {
  afterEach(cleanup);

  it('renders the skill root node and nested entries', () => {
    renderTree();

    expect(screen.getByRole('button', { name: 'demo-skill' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'references' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'notes.txt' })).toBeTruthy();
  });

  it('selects files on click and toggles folders on click', () => {
    const { onSelect, onToggle } = renderTree();

    // 文件：点击 → 选中
    fireEvent.click(screen.getByRole('button', { name: 'notes.txt' }));
    expect(onSelect).toHaveBeenCalledWith(entries[1].children[0]);
    expect(onToggle).not.toHaveBeenCalled();

    // 文件夹：点击 → 切换折叠
    fireEvent.click(screen.getByRole('button', { name: 'references' }));
    expect(onToggle).toHaveBeenCalledWith('references');
    expect(onSelect).not.toHaveBeenCalledWith(entries[1]);
  });

  it('selects the root (null) when the skill folder row is clicked', () => {
    const { onSelect, onToggle } = renderTree();

    fireEvent.click(screen.getByRole('button', { name: 'demo-skill' }));
    expect(onToggle).toHaveBeenCalledWith(ROOT_PATH);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('hides children when the root is collapsed', () => {
    renderTree({ collapsedPaths: new Set([ROOT_PATH]) });

    expect(screen.getByRole('button', { name: 'demo-skill' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'SKILL.md' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'references' })).toBeNull();
  });

  it('marks the root SKILL.md as protected', () => {
    renderTree();

    expect(screen.getByTitle('Protected')).toBeTruthy();
  });

  it('fires context menu with the targeted entry', () => {
    const { onContextMenu } = renderTree();

    fireEvent.contextMenu(screen.getByRole('button', { name: 'notes.txt' }));
    expect(onContextMenu).toHaveBeenCalledWith(
      entries[1].children[0],
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('fires context menu with null for the skill root', () => {
    const { onContextMenu } = renderTree();

    fireEvent.contextMenu(screen.getByRole('button', { name: 'demo-skill' }));
    expect(onContextMenu).toHaveBeenCalledWith(null, expect.any(Number), expect.any(Number));
  });
});
