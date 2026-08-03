import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExternalScanResult, SkillSummary } from '@/types/skill';
import { SkillImportModal } from './SkillImportModal';

const hubSkill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Hub version',
  relativePath: 'review-code',
  contentHash: 'hub-hash',
  favoritedAt: null,
  toolStates: {},
};

const scan: ExternalScanResult = {
  groups: [
    {
      duplicateKey: 'review-code',
      name: 'review-code',
      versions: [
        {
          description: 'External version',
          contentHash: 'external-hash',
          modifiedAtMs: 1,
          usesLowercaseEntry: false,
          sources: [
            {
              targetGroupId: 'codex-group',
              toolIds: ['codex'],
              path: '/home/.codex/skills/review-code',
            },
          ],
        },
      ],
    },
  ],
  invalidEntries: [],
};

const mixedScan: ExternalScanResult = {
  groups: [
    {
      duplicateKey: 'review-code',
      name: 'review-code',
      versions: [
        {
          description: 'External version',
          contentHash: 'external-hash',
          modifiedAtMs: 1,
          usesLowercaseEntry: false,
          sources: [
            {
              targetGroupId: 'codex-group',
              toolIds: ['codex'],
              path: '/home/.codex/skills/review-code',
            },
          ],
        },
      ],
    },
    {
      duplicateKey: 'doc-writer',
      name: 'doc-writer',
      versions: [
        {
          description: 'Brand new skill',
          contentHash: 'doc-hash',
          modifiedAtMs: 2,
          usesLowercaseEntry: false,
          sources: [
            {
              targetGroupId: 'codex-group',
              toolIds: ['codex'],
              path: '/home/.codex/skills/doc-writer',
            },
          ],
        },
      ],
    },
  ],
  invalidEntries: [],
};

describe('SkillImportModal', () => {
  afterEach(cleanup);

  it('defaults to keeping the Hub version for a name conflict', () => {
    const onConfirm = vi.fn();
    render(
      <SkillImportModal
        isOpen
        scan={scan}
        hubSkills={[hubSkill]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onRevealExternal={vi.fn()}
      />
    );

    expect(
      (screen.getByRole('radio', {
        name: 'Keep PromptClip version',
      }) as HTMLInputElement).checked
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));

    expect(onConfirm).toHaveBeenCalledWith([
      {
        skillId: 'review-code',
        contentHash: 'external-hash',
        targetGroupId: 'codex-group',
        decision: 'keepHub',
      },
    ]);
  });

  it('hides the skip option when the skill already exists in the Hub', () => {
    render(
      <SkillImportModal
        isOpen
        scan={scan}
        hubSkills={[hubSkill]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    expect(screen.queryByRole('radio', { name: 'Skip' })).toBeNull();
  });

  it('still offers the skip option for skills not present in the Hub', () => {
    render(
      <SkillImportModal
        isOpen
        scan={scan}
        hubSkills={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect(
      (screen.getByRole('radio', { name: 'Skip' }) as HTMLInputElement)
    ).toBeTruthy();
  });

  it('shows summary and groups scanned skills by existing vs new', () => {
    render(
      <SkillImportModal
        isOpen
        scan={mixedScan}
        hubSkills={[hubSkill]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    expect(
      screen.getByText('Found 2 skills: 1 already in PromptClip, 1 new')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Existing（1）' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New（1）' })).toBeTruthy();
    expect(screen.getByText('review-code')).toBeTruthy();
    expect(screen.getByText('doc-writer')).toBeTruthy();
  });

  it('hides the empty group section when all skills already exist', () => {
    render(
      <SkillImportModal
        isOpen
        scan={scan}
        hubSkills={[hubSkill]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Existing（1）' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^New/ })).toBeNull();
  });

  it('collapses and expands a group on header click', () => {
    render(
      <SkillImportModal
        isOpen
        scan={mixedScan}
        hubSkills={[hubSkill]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    const newHeader = screen.getByRole('button', { name: 'New（1）' });
    expect((newHeader as HTMLButtonElement).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('doc-writer')).toBeTruthy();

    fireEvent.click(newHeader);
    expect(newHeader.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('doc-writer')).toBeNull();

    fireEvent.click(newHeader);
    expect(newHeader.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('doc-writer')).toBeTruthy();
  });

  it('shows external entries that could not be scanned', () => {
    const onRevealExternal = vi.fn();
    render(
      <SkillImportModal
        isOpen
        scan={{
          groups: [],
          invalidEntries: [
            {
              directoryName: 'broken-skill',
              error: {
                code: 'skill_external_link_invalid',
                params: {},
              },
              source: {
                targetGroupId: 'claude-group',
                toolIds: ['claude-code'],
                path: '/home/.claude/skills/broken-skill',
              },
            },
          ],
        }}
        hubSkills={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={onRevealExternal}
      />
    );

    expect(screen.getByText('1 external Skill could not be scanned')).toBeTruthy();
    expect(screen.getByText('broken-skill')).toBeTruthy();
    expect(
      screen.getByText('The symbolic link is broken or does not point to a directory.')
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show /home/.claude/skills/broken-skill in file manager',
      })
    );
    expect(onRevealExternal).toHaveBeenCalledWith('claude-group', 'broken-skill');
  });

  it('shows a specific message with params for a name mismatch', () => {
    render(
      <SkillImportModal
        isOpen
        scan={{
          groups: [],
          invalidEntries: [
            {
              directoryName: 'review-code',
              error: {
                code: 'skill_name_mismatch',
                params: { directoryName: 'review-code', metadataName: 'ReviewCode' },
              },
              source: {
                targetGroupId: 'codex-group',
                toolIds: ['codex'],
                path: '/home/.codex/skills/review-code',
              },
            },
          ],
        }}
        hubSkills={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        'The frontmatter name "ReviewCode" does not match the directory name "review-code".'
      )
    ).toBeTruthy();
    expect(screen.getByText('review-code')).toBeTruthy();
  });

  it('falls back to a generic message for an unknown error code', () => {
    render(
      <SkillImportModal
        isOpen
        scan={{
          groups: [],
          invalidEntries: [
            {
              directoryName: 'mystery-skill',
              error: {
                code: 'some_unknown_code',
                params: {},
              },
              source: {
                targetGroupId: 'codex-group',
                toolIds: ['codex'],
                path: '/home/.codex/skills/mystery-skill',
              },
            },
          ],
        }}
        hubSkills={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    expect(
      screen.getByText('This skill could not be scanned. Please check its directory structure.')
    ).toBeTruthy();
    expect(screen.queryByText('some_unknown_code')).toBeNull();
  });

  it('disables close and confirm while importing', () => {
    render(
      <SkillImportModal
        isOpen
        scan={scan}
        hubSkills={[]}
        isImporting
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onRevealExternal={vi.fn()}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Importing/ });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Importing…')).toBeTruthy();

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    for (const button of closeButtons) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
