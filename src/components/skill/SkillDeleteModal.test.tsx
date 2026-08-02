import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { SkillDeleteModal } from './SkillDeleteModal';

function createSkill(status: 'disabled' | 'enabled' | 'stale' | 'broken'): SkillSummary {
  return {
    id: 'review-code',
    name: 'review-code',
    description: 'Review code safely',
    relativePath: 'review-code',
    contentHash: 'hash',
    favoritedAt: null,
    toolStates: {
      codex: {
        toolId: 'codex',
        targetGroupId: 'codex-group',
        status,
        actualMode: status === 'disabled' ? null : 'symlink',
        message: null,
      },
    },
  };
}

describe('SkillDeleteModal', () => {
  afterEach(cleanup);

  it('offers both deletion scopes when the Skill is managed by an Agent tool', () => {
    render(
      <SkillDeleteModal
        skill={createSkill('enabled')}
        isDeleting={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'Delete everywhere' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete only from PromptClip' })).toBeTruthy();
  });

  it('deletes only the Hub version while preserving managed Agent targets', () => {
    const onConfirm = vi.fn();
    render(
      <SkillDeleteModal
        skill={createSkill('stale')}
        isDeleting={false}
        onClose={() => undefined}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete only from PromptClip' }));

    expect(onConfirm).toHaveBeenCalledWith('hubOnly');
  });

  it('does not treat a broken target as a managed Agent usage', () => {
    render(
      <SkillDeleteModal
        skill={createSkill('broken')}
        isDeleting={false}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'Delete Skill' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Delete everywhere' })).toBeNull();
  });
});
