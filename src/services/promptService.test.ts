import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from '@/types/prompt';
import { createFakeFileRepository, createFakeWorkspace } from './fileRepository';
import { PromptService } from './promptService';

const workspace = createFakeWorkspace();

describe('PromptService repository integration', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads prompts from markdown files using frontmatter stable ids', async () => {
    const repository = createFakeFileRepository({
      files: {
        'hello.md': [
          '---',
          'id: "11111111111111111"',
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
      id: '11111111111111111',
      title: 'Hello',
      content: 'Body',
      tags: ['test'],
      copyCount: 2,
      pinned: true,
      filePath: 'hello.md',
    });
  });

  it('loads a single prompt with caller-provided effective stable id', async () => {
    const repository = createFakeFileRepository({
      files: {
        'legacy.md': [
          '---',
          'title: Legacy',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const [entry] = await repository.listFiles(workspace, ['.md']);

    const prompt = await PromptService.loadPrompt(
      repository,
      workspace,
      entry,
      '11111111111111111'
    );

    expect(prompt).toMatchObject({
      id: '11111111111111111',
      title: 'Legacy',
      filePath: 'legacy.md',
    });
  });

  it('rejects non-stable ids for single prompt loading', async () => {
    const repository = createFakeFileRepository({
      files: {
        'legacy.md': 'Body',
      },
    });
    const [entry] = await repository.listFiles(workspace, ['.md']);

    await expect(
      PromptService.loadPrompt(repository, workspace, entry, 'legacy')
    ).rejects.toThrow('Prompt stable id is invalid');
  });

  it('creates prompts with quoted stable ids in frontmatter', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.1234);
    const repository = createFakeFileRepository({ now: () => new Date() });

    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'My Prompt',
      content: 'First',
      tags: ['work'],
    });

    expect(created.id).toBe('17789760000001234');
    expect(created.filePath).toBe('My Prompt.md');
    expect(repository.dumpFiles()['My Prompt.md']).toContain('id: "17789760000001234"');
  });

  it('migrates prompts without ids by writing generated stable ids to frontmatter', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.2222);
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        'legacy.md': [
          '---',
          'title: Legacy',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    expect(prompt.id).toBe('17789760000002222');
    expect(repository.dumpFiles()['legacy.md']).toContain('id: "17789760000002222"');
  });

  it('preserves Obsidian block tags when migrating prompts without ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.2525);
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        'obsidian.md': [
          '---',
          'created: 2026-02-10',
          'tags:',
          '  - 工具盒/AI工具',
          '---',
          '# 使用XML构建提示词（Prompt）',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const [prompt] = await PromptService.loadPrompts(repository, workspace);
    const saved = repository.dumpFiles()['obsidian.md'];

    expect(prompt.tags).toEqual(['工具盒/AI工具']);
    expect(saved).toContain('id: "17789760000002525"');
    expect(saved).toContain('created: "2026-02-10"');
    expect(saved).toContain('tags:\n  - "工具盒/AI工具"');
    expect(saved).not.toContain('tags: []');
  });

  it('rewrites unquoted stable ids as quoted frontmatter strings', async () => {
    const repository = createFakeFileRepository({
      files: {
        'unquoted.md': [
          '---',
          'id: 11111111111111111',
          'title: Unquoted',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    expect(prompt.id).toBe('11111111111111111');
    expect(repository.dumpFiles()['unquoted.md']).toContain('id: "11111111111111111"');
    expect(repository.dumpFiles()['unquoted.md']).not.toContain('id: 11111111111111111');
  });

  it('regenerates invalid frontmatter ids during load migration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.3333);
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        'invalid.md': [
          '---',
          'id: "old-path-id"',
          'title: Invalid',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    expect(prompt.id).toBe('17789760000003333');
    expect(repository.dumpFiles()['invalid.md']).toContain('id: "17789760000003333"');
    expect(repository.dumpFiles()['invalid.md']).not.toContain('old-path-id');
  });

  it('keeps the canonical duplicate stable id and rewrites the rest', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.4444).mockReturnValueOnce(0.5555);
    let modifiedAt = new Date('2026-05-17T00:00:00.000Z').getTime();
    const repository = createFakeFileRepository({
      now: () => new Date(modifiedAt += 1000),
      files: {
        'z/Alpha.md': [
          '---',
          'id: "11111111111111111"',
          'title: Alpha',
          '---',
          '',
          'Earliest canonical duplicate',
        ].join('\n'),
        'a/Alpha.md': [
          '---',
          'id: "11111111111111111"',
          'title: Alpha',
          '---',
          '',
          'Later duplicate',
        ].join('\n'),
        'b/Other.md': [
          '---',
          'id: "11111111111111111"',
          'title: Alpha',
          '---',
          '',
          'Basename mismatch',
        ].join('\n'),
      },
    });

    const prompts = await PromptService.loadPrompts(repository, workspace);
    const byPath = new Map(prompts.map((prompt) => [prompt.filePath, prompt.id]));

    expect(byPath.get('z/Alpha.md')).toBe('11111111111111111');
    expect(byPath.get('a/Alpha.md')).toBe('17789760000004444');
    expect(byPath.get('b/Other.md')).toBe('17789760000005555');
    expect(repository.dumpFiles()['z/Alpha.md']).toContain('id: "11111111111111111"');
    expect(repository.dumpFiles()['a/Alpha.md']).toContain('id: "17789760000004444"');
    expect(repository.dumpFiles()['b/Other.md']).toContain('id: "17789760000005555"');
  });

  it('uses legacy path ids temporarily when migration writeback fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.6666);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        'legacy.md': [
          '---',
          'title: Legacy',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const writeText = repository.writeText.bind(repository);
    vi.spyOn(repository, 'writeText').mockImplementation(
      async (currentWorkspace, path, content) => {
        if (path === 'legacy.md') {
          throw new Error('write denied');
        }
        return writeText(currentWorkspace, path, content);
      }
    );

    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    expect(prompt.id).toBe('legacy');
    expect(prompt.isTemporaryLegacyId).toBe(true);
    expect(repository.dumpFiles()['legacy.md']).not.toContain('17789760000006666');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to migrate prompt id for file: legacy.md'),
      expect.any(Error)
    );
  });

  it('does not treat numeric temporary legacy ids as persisted stable ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 17, 3, 0, 0));
    vi.spyOn(Math, 'random').mockReturnValue(0.6666);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        '11111111111111111.md': [
          '---',
          'title: Numeric Legacy',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const writeText = repository.writeText.bind(repository);
    let shouldFailMigration = true;
    vi.spyOn(repository, 'writeText').mockImplementation(
      async (currentWorkspace, path, content) => {
        if (path === '11111111111111111.md' && shouldFailMigration) {
          shouldFailMigration = false;
          throw new Error('write denied');
        }
        return writeText(currentWorkspace, path, content);
      }
    );

    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    expect(prompt).toMatchObject({
      id: '11111111111111111',
      isTemporaryLegacyId: true,
    });

    await PromptService.updatePrompt(repository, workspace, prompt, {
      id: prompt.id,
      content: 'Changed',
    });
    await PromptService.createHistoryVersion(repository, workspace, prompt);
    await PromptService.deletePrompt(repository, workspace, prompt);

    const files = repository.dumpFiles();
    expect(files['11111111111111111.md']).toBeUndefined();
    expect(Object.keys(files)).toContain('.trash/11111111111111111.2026-05-17-030000.md');
    expect(Object.keys(files).some((path) => path.startsWith('.history/'))).toBe(false);
    expect(Object.values(files).join('\n')).not.toContain('id: "11111111111111111"');
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Cannot create history for non-persisted prompt id: 11111111111111111')
    );
  });

  it(
    'updates and does not write history when history versions are disabled',
    async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 17, 1, 0, 0));
      vi.spyOn(Math, 'random').mockReturnValue(0.1234);
      const repository = createFakeFileRepository({ now: () => new Date() });

      const created = await PromptService.createPrompt(repository, workspace, {
        title: 'My Prompt',
        content: 'First',
        tags: ['work'],
      });

      vi.setSystemTime(new Date(2026, 4, 17, 2, 0, 0));
      const updated = await PromptService.updatePrompt(repository, workspace, created, {
        id: created.id,
        title: 'My Prompt Renamed',
        content: 'Second',
        tags: ['work', 'done'],
      });

      expect(updated.id).toBe(created.id);
      expect(updated.filePath).toBe('My Prompt Renamed.md');
      expect(await repository.exists(workspace, 'My Prompt.md')).toBe(false);
      expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(true);
      expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(
        false
      );
    }
  );

  it(
    'updates, preserves stable id, writes stable history when enabled, and deletes to stable trash',
    async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 17, 1, 0, 0));
      vi.spyOn(Math, 'random').mockReturnValue(0.1234);
      const repository = createFakeFileRepository({
        now: () => new Date(),
        files: {
          '.promptclip.json': JSON.stringify({
            historyVersions: {
              enabled: true,
              retentionDays: 30,
            },
            pinnedTags: [],
          }),
        },
      });

      const created = await PromptService.createPrompt(repository, workspace, {
        title: 'My Prompt',
        content: 'First',
        tags: ['work'],
      });

      vi.setSystemTime(new Date(2026, 4, 17, 2, 0, 0));
      const updated = await PromptService.updatePrompt(repository, workspace, created, {
        id: created.id,
        title: 'My Prompt Renamed',
        content: 'Second',
        tags: ['work', 'done'],
      });

      expect(updated.id).toBe(created.id);
      expect(updated.filePath).toBe('My Prompt Renamed.md');
      expect(await repository.exists(workspace, 'My Prompt.md')).toBe(false);
      expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(true);
      expect(repository.dumpFiles()['My Prompt Renamed.md']).toContain(`id: "${created.id}"`);

      const historyVersions = await PromptService.getHistoryVersions(
        repository,
        workspace,
        created.id
      );
      expect(historyVersions).toHaveLength(1);
      expect(historyVersions[0].filename).toBe(`${created.id}.2026-05-17-010000.md`);

      vi.setSystemTime(new Date(2026, 4, 17, 3, 0, 0));
      await PromptService.deletePrompt(repository, workspace, updated);

      expect(await repository.exists(workspace, 'My Prompt Renamed.md')).toBe(false);
      expect(Object.keys(repository.dumpFiles())).toContain(
        `.history/${created.id}.2026-05-17-010000.md`
      );
      expect(Object.keys(repository.dumpFiles())).toContain(
        `.trash/${created.id}.2026-05-17-030000.md`
      );
    }
  );

  it('does not persist temporary legacy ids or create legacy history on update', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = createFakeFileRepository({
      files: {
        'legacy.md': [
          '---',
          'title: Legacy',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });

    const updated = await PromptService.updatePrompt(
      repository,
      workspace,
      createPromptFixture({ id: 'legacy', filePath: 'legacy.md' }),
      {
        id: 'legacy',
        content: 'Changed',
      }
    );

    expect(updated.id).toBe('legacy');
    expect(repository.dumpFiles()['legacy.md']).not.toContain('id: "legacy"');
    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(
      false
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Cannot create history for non-persisted prompt id: legacy')
    );
  });

  it('does not create history versions for temporary legacy ids', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = createFakeFileRepository({
      files: {
        'legacy.md': 'Body',
      },
    });

    await PromptService.createHistoryVersion(
      repository,
      workspace,
      createPromptFixture({ id: 'legacy', filePath: 'legacy.md' })
    );

    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(
      false
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Cannot create history for non-persisted prompt id: legacy')
    );
  });

  it('does not create history versions for stable ids when history versions are disabled', async () => {
    const repository = createFakeFileRepository({
      files: {
        'Stable.md': 'Body',
      },
    });

    await PromptService.createHistoryVersion(
      repository,
      workspace,
      createPromptFixture({ filePath: 'Stable.md' })
    );

    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(
      false
    );
  });

  it('uses a current filename fallback when deleting temporary legacy ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 17, 3, 0, 0));
    const repository = createFakeFileRepository({
      files: {
        'folder/Legacy Title.md': 'Body',
      },
    });

    await PromptService.deletePrompt(
      repository,
      workspace,
      createPromptFixture({
        id: 'legacy',
        title: 'Legacy Title',
        filePath: 'folder/Legacy Title.md',
      })
    );

    expect(Object.keys(repository.dumpFiles())).toContain(
      '.trash/Legacy Title.2026-05-17-030000.md'
    );
    expect(Object.keys(repository.dumpFiles())).not.toContain('.trash/legacy.2026-05-17-030000.md');
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

    expect(Object.keys(repository.dumpFiles()).some((path) => path.startsWith('.history/'))).toBe(
      false
    );
  });

  it('records pinned time when favoriting and clears it when unfavoriting', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
    const repository = createFakeFileRepository({ now: () => new Date() });
    const created = await PromptService.createPrompt(repository, workspace, {
      title: 'Favorite',
      content: 'Text',
      tags: [],
    });

    vi.setSystemTime(new Date('2026-05-18T01:00:00.000Z'));
    const favorited = await PromptService.togglePinned(repository, workspace, created);
    expect(favorited.pinnedAt?.toISOString()).toBe('2026-05-18T01:00:00.000Z');
    expect(repository.dumpFiles()['Favorite.md']).toContain(
      'pinned_at: "2026-05-18T01:00:00.000Z"'
    );

    vi.setSystemTime(new Date('2026-05-18T02:00:00.000Z'));
    const unfavorited = await PromptService.togglePinned(repository, workspace, favorited);
    expect(unfavorited.pinnedAt).toBeUndefined();
    expect(repository.dumpFiles()['Favorite.md']).not.toContain('pinned_at');
  });

  it('preserves nested directories when updating and renaming prompts', async () => {
    const repository = createFakeFileRepository({
      files: {
        'folder/Foo.md': [
          '---',
          'id: "11111111111111111"',
          'title: Foo',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    const copied = await PromptService.incrementCopyCount(repository, workspace, prompt);
    expect(copied.filePath).toBe('folder/Foo.md');
    expect(await repository.exists(workspace, 'folder/Foo.md')).toBe(true);
    expect(await repository.exists(workspace, 'Foo.md')).toBe(false);

    const renamed = await PromptService.updatePrompt(repository, workspace, copied, {
      id: copied.id,
      title: 'Bar',
    });

    expect(renamed).toMatchObject({
      id: '11111111111111111',
      filePath: 'folder/Bar.md',
    });
    expect(await repository.exists(workspace, 'folder/Foo.md')).toBe(false);
    expect(await repository.exists(workspace, 'folder/Bar.md')).toBe(true);
    expect(await repository.exists(workspace, 'Bar.md')).toBe(false);
  });

  it('keeps the original path for non-title updates when filename differs from title', async () => {
    const repository = createFakeFileRepository({
      files: {
        'draft.md': [
          '---',
          'id: "11111111111111111"',
          'title: Final',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    const updated = await PromptService.updatePrompt(repository, workspace, prompt, {
      id: prompt.id,
      tags: ['kept'],
    });

    expect(updated.filePath).toBe('draft.md');
    expect(await repository.exists(workspace, 'draft.md')).toBe(true);
    expect(await repository.exists(workspace, 'Final.md')).toBe(false);
  });

  it('preserves Obsidian block tag format when updating an existing prompt', async () => {
    const repository = createFakeFileRepository({
      files: {
        'obsidian.md': [
          '---',
          'id: "11111111111111111"',
          'title: Obsidian',
          'tags:',
          '  - 工具盒/AI工具',
          'created: "2026-05-17T00:00:00.000Z"',
          'modified: "2026-05-17T00:00:00.000Z"',
          'copy_count: 0',
          'pinned: false',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    await PromptService.updatePrompt(repository, workspace, prompt, {
      id: prompt.id,
      tags: ['工具盒/AI工具', '写作'],
    });

    const saved = repository.dumpFiles()['obsidian.md'];
    expect(saved).toContain('tags:\n  - "工具盒/AI工具"\n  - "写作"');
    expect(saved).not.toContain('tags: ["工具盒/AI工具", "写作"]');
  });

  it('does not delete the prompt during case-only title renames', async () => {
    const repository = createFakeFileRepository({
      files: {
        'foo.md': [
          '---',
          'id: "11111111111111111"',
          'title: foo',
          '---',
          '',
          'Body',
        ].join('\n'),
      },
    });
    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    const updated = await PromptService.updatePrompt(repository, workspace, prompt, {
      id: prompt.id,
      title: 'Foo',
    });

    expect(updated.filePath).toBe('Foo.md');
    expect(await repository.exists(workspace, 'Foo.md')).toBe(true);
    expect(Object.keys(repository.dumpFiles())).toContain('Foo.md');
    expect(Object.keys(repository.dumpFiles())).not.toContain('foo.md');
  });

  it('rejects case-only renames when the target path already exists', async () => {
    const repository = createFakeFileRepository({
      files: {
        'foo.md': [
          '---',
          'id: "11111111111111111"',
          'title: foo',
          '---',
          '',
          'Lower',
        ].join('\n'),
        'Foo.md': [
          '---',
          'id: "22222222222222222"',
          'title: Foo',
          '---',
          '',
          'Upper',
        ].join('\n'),
      },
    });
    const prompts = await PromptService.loadPrompts(repository, workspace);
    const prompt = prompts.find((item) => item.filePath === 'foo.md');

    expect(prompt).toBeDefined();
    await expect(
      PromptService.updatePrompt(repository, workspace, prompt!, {
        id: prompt!.id,
        title: 'Foo',
      })
    ).rejects.toThrow('标题已存在，请使用不同的标题');

    expect(repository.dumpFiles()['Foo.md']).toContain('Upper');
  });

  it(
    'generates unique stable ids for duplicate nested basenames without frontmatter ids',
    async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-17T00:00:00.000Z'));
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.7778).mockReturnValueOnce(0.8888);
      const repository = createFakeFileRepository({
        now: () => new Date(),
        files: {
          'a/foo.md': 'A',
          'b/foo.md': 'B',
        },
      });

      const prompts = await PromptService.loadPrompts(repository, workspace);

      expect(prompts.map((prompt) => prompt.id).sort()).toEqual([
        '17789760000007778',
        '17789760000008888',
      ]);
    }
  );

  it('matches history versions by exact stable id filename pattern', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.history/11111111111111111.2026-05-17-010000.md': 'Stable',
        '.history/11111111111111111.extra.2026-05-17-010000.md': 'Extra delimiter',
        '.history/x11111111111111111.2026-05-17-010000.md': 'Prefix',
        '.history/11111111111111111.2026-05-17-0100.md': 'Bad timestamp',
      },
    });

    const versions = await PromptService.getHistoryVersions(
      repository,
      workspace,
      '11111111111111111'
    );

    expect(versions).toHaveLength(1);
    expect(versions[0].filename).toBe('11111111111111111.2026-05-17-010000.md');
  });

  it('does not match old path-based history files for stable id queries', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.history/foo.2026-05-17-010000.md': 'Old path history',
        '.history/foo%2Ebar.2026-05-17-010000.md': 'Old encoded history',
      },
    });

    const versions = await PromptService.getHistoryVersions(
      repository,
      workspace,
      '11111111111111111'
    );

    expect(versions).toHaveLength(0);
  });

  it('does not match history files when queried with non-stable ids', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.history/foo.2026-05-17-010000.md': 'Old path history',
      },
    });

    const versions = await PromptService.getHistoryVersions(repository, workspace, 'foo');

    expect(versions).toHaveLength(0);
  });

  it('loads history versions with parsed content and edited times', async () => {
    const repository = createFakeFileRepository({
      files: {
        '.history/11111111111111111.2026-05-17-010000.md': [
          '---',
          'id: "11111111111111111"',
          'title: First History',
          'tags: ["work"]',
          'modified: "2026-05-17T01:00:00.000Z"',
          'copy_count: 3',
          'pinned: true',
          '---',
          '',
          'First body',
        ].join('\n'),
        '.history/11111111111111111.2026-05-17-020000.md': [
          '---',
          'id: "11111111111111111"',
          'title: Latest History',
          'tags: ["done"]',
          'modified: "2026-05-17T02:00:00.000Z"',
          '---',
          '',
          'Latest body',
        ].join('\n'),
      },
    });

    const versions = await PromptService.getHistoryVersions(
      repository,
      workspace,
      '11111111111111111'
    );

    expect(versions.map((version) => version.title)).toEqual([
      'Latest History',
      'First History',
    ]);
    expect(versions[0]).toMatchObject({
      filename: '11111111111111111.2026-05-17-020000.md',
      content: 'Latest body',
      tags: ['done'],
    });
    expect(versions[0].editedAt.toISOString()).toBe('2026-05-17T02:00:00.000Z');
    expect(versions[1]).toMatchObject({
      content: 'First body',
      copyCount: 3,
      pinned: true,
    });
  });

  it('restores a history version after saving the current prompt as history', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 17, 3, 0, 0));
    const repository = createFakeFileRepository({
      now: () => new Date(),
      files: {
        '.promptclip.json': JSON.stringify({
          historyVersions: {
            enabled: true,
            retentionDays: 30,
          },
          pinnedTags: [],
        }),
        'Current.md': [
          '---',
          'id: "11111111111111111"',
          'title: Current',
          'tags: ["current"]',
          'modified: "2026-05-17T03:00:00.000"',
          'copy_count: 7',
          'pinned: false',
          '---',
          '',
          'Current body',
        ].join('\n'),
        '.history/11111111111111111.2026-05-17-010000.md': [
          '---',
          'id: "11111111111111111"',
          'title: Restored',
          'tags: ["restored"]',
          'created: "2026-05-16T00:00:00.000Z"',
          'modified: "2026-05-17T01:00:00.000Z"',
          'copy_count: 2',
          'pinned: true',
          'pinned_at: "2026-05-17T00:30:00.000Z"',
          '---',
          '',
          'Restored body',
        ].join('\n'),
      },
    });
    const [prompt] = await PromptService.loadPrompts(repository, workspace);

    const restored = await PromptService.restoreHistoryVersion(
      repository,
      workspace,
      prompt,
      '11111111111111111.2026-05-17-010000.md'
    );

    expect(restored).toMatchObject({
      id: '11111111111111111',
      title: 'Restored',
      content: 'Restored body',
      tags: ['restored'],
      copyCount: 2,
      pinned: true,
      filePath: 'Restored.md',
    });
    expect(restored.pinnedAt?.toISOString()).toBe('2026-05-17T00:30:00.000Z');
    expect(repository.dumpFiles()['Restored.md']).toContain('Restored body');
    expect(repository.dumpFiles()['Restored.md']).toContain('id: "11111111111111111"');
    expect(repository.dumpFiles()['Current.md']).toBeUndefined();
    expect(Object.keys(repository.dumpFiles())).toContain(
      '.history/11111111111111111.2026-05-17-030000.md'
    );
    expect(repository.dumpFiles()['.history/11111111111111111.2026-05-17-030000.md']).toContain(
      'Current body'
    );
  });
});

function createPromptFixture(overrides: Partial<Prompt>): Prompt {
  return {
    id: '11111111111111111',
    title: 'Legacy',
    content: 'Body',
    tags: [],
    createdAt: new Date('2026-05-17T00:00:00.000Z'),
    updatedAt: new Date('2026-05-17T00:00:00.000Z'),
    copyCount: 0,
    pinned: false,
    filePath: 'legacy.md',
    ...overrides,
  };
}
