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

  it('switches Markdown files between edit and preview in a segmented control', () => {
    render(
      <SkillFileEditor
        entry={markdownEntry}
        file={textFile}
        onSave={() => undefined}
        onDownload={() => undefined}
      />,
    );

    const modeControl = screen.getByRole('group', { name: 'Edit / Preview' });
    const editButton = screen.getByRole('button', { name: 'Edit' });
    const previewButton = screen.getByRole('button', { name: 'Preview' });

    expect(modeControl.contains(editButton)).toBe(true);
    expect(modeControl.contains(previewButton)).toBe(true);
    expect(editButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(previewButton);

    expect(previewButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('markdown-preview-editor')).toBeTruthy();

    fireEvent.click(editButton);

    expect(editButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'SKILL.md' })).toBeTruthy();
  });

  it('shows a download fallback for binary files', () => {
    const binary = { ...markdownEntry, name: 'asset.bin', relativePath: 'asset.bin', isText: false, isMarkdown: false };
    render(<SkillFileEditor entry={binary} file={null} onSave={() => undefined} onDownload={() => undefined} />);

    expect(screen.getByText(/cannot be previewed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });
});
