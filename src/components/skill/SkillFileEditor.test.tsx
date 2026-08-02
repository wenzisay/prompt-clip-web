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
const htmlEntry: SkillFileEntry = {
  ...markdownEntry,
  name: 'demo.html',
  relativePath: 'demo.html',
  isMarkdown: false,
};
const htmlFile: SkillTextFile = {
  relativePath: 'demo.html',
  content: '<h1>Hello</h1>',
  modifiedAtMs: 1,
  isMarkdown: false,
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

  it('switches HTML files between edit and a sandboxed iframe preview', () => {
    render(
      <SkillFileEditor
        entry={htmlEntry}
        file={htmlFile}
        onSave={() => undefined}
        onDownload={() => undefined}
      />,
    );

    const editButton = screen.getByRole('button', { name: 'Edit' });
    const previewButton = screen.getByRole('button', { name: 'Preview' });

    // HTML 文件同样显示 Edit/Preview 切换，默认编辑态
    expect(editButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'demo.html' })).toBeTruthy();

    fireEvent.click(previewButton);

    const iframe = screen.getByTestId('html-preview') as HTMLIFrameElement;
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('sandbox')).toBe('');
    expect(iframe.getAttribute('srcdoc')).toBe('<h1>Hello</h1>');
    expect(iframe.getAttribute('title')).toBe('demo.html');

    fireEvent.click(editButton);

    expect(editButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'demo.html' })).toBeTruthy();
  });

  it('renders frontmatter block and prose body in Markdown preview', async () => {
    const withFm: SkillTextFile = {
      ...textFile,
      content: '---\nname: demo\ndescription: hi\n---\n\n# Title\n\nbody',
    };
    render(
      <SkillFileEditor
        entry={markdownEntry}
        file={withFm}
        onSave={() => undefined}
        onDownload={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    const preview = screen.getByTestId('markdown-preview-editor');
    // 元数据区以原始文本形式呈现（含 --- 包裹），同步渲染
    expect(preview.textContent).toContain('name: demo');
    expect(preview.textContent).toContain('description: hi');
    expect(preview.textContent).toContain('---');
    // 正文由 PromptContent 异步渲染：等待 # Title 变成 <h1>
    const heading = await screen.findByText('Title');
    expect(heading.tagName).toBe('H1');
  });

  it('shows a download fallback for binary files', () => {
    const binary = { ...markdownEntry, name: 'asset.bin', relativePath: 'asset.bin', isText: false, isMarkdown: false };
    render(<SkillFileEditor entry={binary} file={null} onSave={() => undefined} onDownload={() => undefined} />);

    expect(screen.getByText(/cannot be previewed/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });
});
