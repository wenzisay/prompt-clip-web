import { describe, expect, it } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { PromptService } from './promptService';

const workspace = createFakeWorkspace();

describe('PromptService repository integration', () => {
  it('loads prompts from markdown files with file paths', async () => {
    const repository = createFakeFileRepository({
      files: {
        'hello.md': [
          '---',
          'title: Hello',
          'tags:',
          '  - test',
          'copy_count: 2',
          'pinned: true',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const prompts = await PromptService.loadPrompts(repository, workspace);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      id: 'hello',
      title: 'Hello',
      content: 'Body',
      tags: ['test'],
      copyCount: 2,
      pinned: true,
      filePath: 'hello.md',
    });
  });

  it('creates, updates with history, and deletes via repository paths', async () => {
    const repository = createFakeFileRepository();

    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'My Prompt',
      content: 'First',
      tags: ['work'],
    });
    expect(created.filePath).toBe('My Prompt.md');

    const updated = await PromptService.updatePrompt(repository, workspace, created, {
      id: created.id,
      title: 'My Prompt Renamed',
      content: 'Second',
      tags: ['work', 'done'],
    });

    expect(updated.filePath).toBe('My Prompt Renamed.md');
    expect(await repository.exists(workspace, 'My Prompt.md')).toBe(false);
    expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(true);

    await PromptService.deletePrompt(repository, workspace, updated);
    expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(false);

    const files = repository.dumpFiles();
    expect(Object.keys(files).some((path) => path.startsWith('.history/'))).toBe(true);
    expect(Object.keys(files).some((path) => path.startsWith('.trash/'))).toBe(true);
  });

  it('does not create history for copy count and pinned updates', async () => {
    const repository = createFakeFileRepository();
    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'Counter',
      content: 'Text',
      tags: [],
    });

    await PromptService.incrementCopyCount(repository, workspace, created);
    await PromptService.togglePinned(repository, workspace, created);

    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(false);
  });
});
