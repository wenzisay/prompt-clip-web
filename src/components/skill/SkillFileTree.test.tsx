import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillFileEntry } from '@/types/skill';
import { SkillFileTree } from './SkillFileTree';

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
    children: [{
      name: 'notes.txt',
      relativePath: 'references/notes.txt',
      isDirectory: false,
      isText: true,
      isMarkdown: false,
      size: 5,
      modifiedAtMs: 1,
      children: [],
    }],
  },
];

describe('SkillFileTree', () => {
  afterEach(cleanup);

  it('renders nested entries and selects files', () => {
    const onSelect = vi.fn();
    render(<SkillFileTree entries={entries} selectedPath={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'notes.txt' }));

    expect(onSelect).toHaveBeenCalledWith(entries[1].children[0]);
  });

  it('marks the root SKILL.md as protected', () => {
    render(<SkillFileTree entries={entries} selectedPath="SKILL.md" onSelect={() => undefined} />);

    expect(screen.getByTitle('Protected')).toBeTruthy();
  });
});
