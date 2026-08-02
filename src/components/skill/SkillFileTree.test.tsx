import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillFileEntry } from '@/types/skill';
import { SkillFileTree, ROOT_PATH, SKILL_ENTRY_MIME } from './SkillFileTree';

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
    onDropFiles: vi.fn(),
    onDropEntry: vi.fn(),
    onDragOverPathChange: vi.fn(),
    onDraggingPathChange: vi.fn(),
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
      dragOverPath={null}
      draggingPath={null}
      onDropFiles={handlers.onDropFiles}
      onDropEntry={handlers.onDropEntry}
      onDragOverPathChange={handlers.onDragOverPathChange}
      onDraggingPathChange={handlers.onDraggingPathChange}
      {...overrides}
    />,
  );
  return { ...handlers, ...utils };
}

/** 构造带 Files 类型的 dataTransfer，模拟从系统拖入文件。 */
function filesDataTransfer(files: File[] = []) {
  return {
    dataTransfer: {
      files,
      items: files.map((file) => ({ kind: 'file', type: file.type })),
      types: ['Files'],
    },
  } as unknown as React.DragEvent;
}

/** files-only dragover（无 entries，避免 webkitGetAsEntry 在 jsdom 未实现） */
function dragOverEvent() {
  return {
    dataTransfer: { types: ['Files'] },
  } as unknown as React.DragEvent;
}

/** 内部条目拖动的事件：types 含自定义 MIME */
function internalDragOverEvent() {
  return {
    dataTransfer: { types: [SKILL_ENTRY_MIME] },
  } as unknown as React.DragEvent;
}

/** 内部条目 drop 事件 */
function internalDropEvent() {
  return {
    dataTransfer: { types: [SKILL_ENTRY_MIME] },
  } as unknown as React.DragEvent;
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

  it('highlights the directory row when dragOverPath matches it', () => {
    renderTree({ dragOverPath: 'references' });

    const referencesRow = screen.getByRole('button', { name: 'references' });
    expect(referencesRow.className).toContain('ring-2');
  });

  it('highlights the parent directory when dragging files over a file row', () => {
    // 文件行 notes.txt 的落点是其父目录 references，因此 dragOverPath 应高亮 references
    renderTree({ dragOverPath: 'references' });

    const notesRow = screen.getByRole('button', { name: 'notes.txt' });
    expect(notesRow.className).not.toContain('ring-2');
    const referencesRow = screen.getByRole('button', { name: 'references' });
    expect(referencesRow.className).toContain('ring-2');
  });

  it('reports the directory path when dragging files over a directory row', () => {
    const { onDragOverPathChange } = renderTree();

    fireEvent.dragOver(screen.getByRole('button', { name: 'references' }), dragOverEvent());
    expect(onDragOverPathChange).toHaveBeenCalledWith('references');
  });

  it('reports the parent directory path when dragging files over a file row', () => {
    const { onDragOverPathChange } = renderTree();

    fireEvent.dragOver(screen.getByRole('button', { name: 'notes.txt' }), dragOverEvent());
    // 文件行的 dropTargetPath 是其父目录 references
    expect(onDragOverPathChange).toHaveBeenCalledWith('references');
  });

  it('drops files onto a directory row and forwards the directory entry', () => {
    const { onDropFiles } = renderTree();
    const file = new File(['hi'], 'image.png', { type: 'image/png' });

    fireEvent.drop(screen.getByRole('button', { name: 'references' }), filesDataTransfer([file]));

    expect(onDropFiles).toHaveBeenCalledTimes(1);
    const [entry] = onDropFiles.mock.calls[0] as [SkillFileEntry, React.DragEvent];
    expect(entry.relativePath).toBe('references');
  });

  it('drops files onto the root row with null target', () => {
    const { onDropFiles } = renderTree();
    const file = new File(['hi'], 'doc.md', { type: 'text/markdown' });

    fireEvent.drop(screen.getByRole('button', { name: 'demo-skill' }), filesDataTransfer([file]));

    expect(onDropFiles).toHaveBeenCalledWith(null, expect.anything());
  });

  it('ignores drags that do not carry files', () => {
    const { onDragOverPathChange } = renderTree();

    fireEvent.dragOver(
      screen.getByRole('button', { name: 'references' }),
      { dataTransfer: { types: ['text/plain'] } } as unknown as React.DragEvent,
    );
    expect(onDragOverPathChange).not.toHaveBeenCalled();
  });

  // ---- 内部条目拖动（移动）----

  it('marks SKILL.md as non-draggable', () => {
    renderTree();

    const skillMdRow = screen.getByRole('button', { name: 'SKILL.md' });
    expect(skillMdRow.draggable).toBe(false);
  });

  it('marks non-protected entries as draggable', () => {
    renderTree();

    expect(screen.getByRole('button', { name: 'references' }).draggable).toBe(true);
    expect(screen.getByRole('button', { name: 'notes.txt' }).draggable).toBe(true);
  });

  it('reports dragging path on internal dragstart', () => {
    const { onDraggingPathChange } = renderTree();
    const dt = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: 'notes.txt' }), {
      dataTransfer: dt,
    } as unknown as React.DragEvent);

    expect(onDraggingPathChange).toHaveBeenCalledWith('references/notes.txt');
    expect(dt.setData).toHaveBeenCalledWith(SKILL_ENTRY_MIME, 'references/notes.txt');
    expect(dt.effectAllowed).toBe('move');
  });

  it('fires onDropEntry when dropping an internal entry onto a directory', () => {
    const { onDropEntry, onDraggingPathChange } = renderTree({ draggingPath: 'references/notes.txt' });

    fireEvent.drop(screen.getByRole('button', { name: 'references' }), internalDropEvent());

    expect(onDropEntry).toHaveBeenCalledTimes(1);
    const [source, target] = onDropEntry.mock.calls[0] as [SkillFileEntry, SkillFileEntry];
    expect(source.relativePath).toBe('references/notes.txt');
    expect(target.relativePath).toBe('references');
    expect(onDraggingPathChange).toHaveBeenCalledWith(null);
  });

  it('does not fire onDropFiles for an internal entry drop', () => {
    const { onDropFiles, onDropEntry } = renderTree({ draggingPath: 'references/notes.txt' });

    fireEvent.drop(screen.getByRole('button', { name: 'references' }), internalDropEvent());

    expect(onDropEntry).toHaveBeenCalled();
    expect(onDropFiles).not.toHaveBeenCalled();
  });

  it('reports a valid directory as drop target during internal dragover', () => {
    const { onDragOverPathChange } = renderTree({ draggingPath: 'references/notes.txt' });

    // 拖到根级文件 SKILL.md 上 → 落点是其父目录（根路径）
    fireEvent.dragOver(screen.getByRole('button', { name: 'SKILL.md' }), internalDragOverEvent());
    expect(onDragOverPathChange).toHaveBeenCalledWith(ROOT_PATH);
  });

  it('does not allow dragging a directory onto its own descendant', () => {
    const { onDragOverPathChange } = renderTree({ draggingPath: 'references' });

    // references 不能拖入自身（其 dropTargetPath 也是 'references'）
    fireEvent.dragOver(screen.getByRole('button', { name: 'references' }), internalDragOverEvent());
    expect(onDragOverPathChange).not.toHaveBeenCalledWith('references');
  });

  it('clears dragging path on dragend', () => {
    const { onDraggingPathChange } = renderTree();

    fireEvent.dragEnd(screen.getByRole('button', { name: 'notes.txt' }));

    expect(onDraggingPathChange).toHaveBeenCalledWith(null);
  });

  it('auto-expands a collapsed directory after hovering during internal drag', () => {
    vi.useFakeTimers();
    const { onToggle } = renderTree({ collapsedPaths: new Set(['references']), draggingPath: 'notes.txt' });

    fireEvent.dragOver(screen.getByRole('button', { name: 'references' }), internalDragOverEvent());
    expect(onToggle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(onToggle).toHaveBeenCalledWith('references');
    vi.useRealTimers();
  });
});
