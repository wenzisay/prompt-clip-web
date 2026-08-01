import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillFileEntry, SkillTextFile } from '@/types/skill';
import { SkillFileEditor } from './SkillFileEditor';

const markdownEntry: SkillFileEntry = {
  name: 'SKILL.md',
  relativePath: 'SKILL.md',
  isDirectory: false,
  isText: true,
  isMarkdown: true,
  size: 10,
  modifiedAtMs: 1,
  children: [],
};
const textFile: SkillTextFile = {
  relativePath: 'SKILL.md',
  content: '# Title',
  modifiedAtMs: 1,
  isMarkdown: true,
};

describe('SkillFileEditor', () => {
  afterEach(cleanup);

  it('edits and saves Markdown content', () => {
    const onSave = vi.fn();
    render(<SkillFileEditor entry={markdownEntry} file={textFile} onSave={onSave} onDownload={() => undefined} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '# Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('# Updated', 1);
  });

  it('shows a download fallback for binary files', () => {
    const binary = { ...markdownEntry, name: 'asset.bin', relativePath: 'asset.bin', isText: false, isMarkdown: false };
    render(<SkillFileEditor entry={binary} file={null} onSave={() => undefined} onDownload={() => undefined} />);

    expect(screen.getByText(/cannot be previewed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });
});
