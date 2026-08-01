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
      screen.getByText('The symbolic link is broken or does not point to a directory')
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show /home/.claude/skills/broken-skill in file manager',
      })
    );
    expect(onRevealExternal).toHaveBeenCalledWith('claude-group', 'broken-skill');
  });
});
