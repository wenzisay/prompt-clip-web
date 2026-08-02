import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteSkill,
  forceEnableSkill,
  readSkillTextFile,
  revealExternalSkill,
  scanSkills,
  setSkillEnabled,
  writeSkillTextFile,
} from './skillService';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

function installTauriRuntime(): void {
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    configurable: true,
    value: {},
  });
}

describe('skillService', () => {
  afterEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  });

  it('rejects scanning with a stable error outside Tauri', async () => {
    await expect(scanSkills()).rejects.toMatchObject({
      code: 'skill_desktop_only',
      params: {},
    });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('invokes the native skill scan in Tauri', async () => {
    installTauriRuntime();
    const response = {
      skillsPath: '/home/user/.prompt-clip/skills',
      skills: [],
      invalidEntries: [],
      tools: [],
      errors: [],
    };
    mocks.invoke.mockResolvedValue(response);

    await expect(scanSkills()).resolves.toBe(response);
    expect(mocks.invoke).toHaveBeenCalledWith('skill_scan');
  });

  it('passes only identifiers and desired state when toggling a target group', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue({
      targetGroupId: 'group',
      toolIds: ['codex'],
      state: { status: 'enabled', actualMode: 'copy', message: null },
    });

    await setSkillEnabled({
      skillId: 'review-code',
      targetGroupId: 'group',
      enabled: true,
    });

    expect(mocks.invoke).toHaveBeenCalledWith('skill_set_tool_enabled', {
      skillId: 'review-code',
      targetGroupId: 'group',
      enabled: true,
    });
  });

  it('uses the explicit native force command when taking over a conflict', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue({
      targetGroupId: 'group',
      toolIds: ['codex'],
      state: { status: 'enabled', actualMode: 'copy', message: null },
    });

    await forceEnableSkill({
      skillId: 'review-code',
      targetGroupId: 'group',
    });

    expect(mocks.invoke).toHaveBeenCalledWith('skill_force_enable', {
      skillId: 'review-code',
      targetGroupId: 'group',
    });
  });

  it('reveals an external Skill using identifiers instead of an absolute path', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue(undefined);

    await revealExternalSkill('claude-group', 'node_modules');

    expect(mocks.invoke).toHaveBeenCalledWith('skill_reveal_external', {
      targetGroupId: 'claude-group',
      directoryName: 'node_modules',
    });
  });

  it('passes only a skill identifier and relative path when reading a file', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue({
      relativePath: 'references/notes.md',
      content: '# Notes',
      modifiedAtMs: 42,
      isMarkdown: true,
    });

    await readSkillTextFile('review-code', 'references/notes.md');

    expect(mocks.invoke).toHaveBeenCalledWith('skill_read_text_file', {
      skillId: 'review-code',
      relativePath: 'references/notes.md',
    });
  });

  it('passes the optimistic concurrency timestamp when saving text', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue({ file: {}, syncErrors: [] });

    await writeSkillTextFile('review-code', 'SKILL.md', 'updated', 42);

    expect(mocks.invoke).toHaveBeenCalledWith('skill_write_text_file', {
      skillId: 'review-code',
      relativePath: 'SKILL.md',
      content: 'updated',
      expectedModifiedAtMs: 42,
    });
  });

  it('passes the selected deletion scope to the native command', async () => {
    installTauriRuntime();
    mocks.invoke.mockResolvedValue(undefined);

    await deleteSkill('review-code', 'hubOnly');

    expect(mocks.invoke).toHaveBeenCalledWith('skill_delete', {
      skillId: 'review-code',
      mode: 'hubOnly',
    });
  });
});
