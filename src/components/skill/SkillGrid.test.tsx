import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillGrid } from './SkillGrid';

const skill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review code',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  categoryIds: [],
  toolStates: {},
};

describe('SkillGrid', () => {
  afterEach(cleanup);

  it('renders the filter area before the skill cards', () => {
    useSkillStore.getState().reset();
    render(<SkillGrid skills={[skill]} tools={[]} isLoading={false} />);

    const filterArea = screen.getByRole('group', { name: 'Skills' });
    const card = screen.getByText('review-code');

    expect(filterArea.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows scan and create CTAs when the hub has no skills yet', () => {
    useSkillStore.getState().reset();
    const onRescan = vi.fn();
    const onCreateSkill = vi.fn();
    render(
      <SkillGrid
        skills={[]}
        tools={[]}
        isLoading={false}
        hasAnyHubSkills={false}
        onRescan={onRescan}
        onCreateSkill={onCreateSkill}
      />
    );

    expect(screen.getByText('No Skills yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    fireEvent.click(screen.getByRole('button', { name: 'New' }));

    expect(onRescan).toHaveBeenCalledOnce();
    expect(onCreateSkill).toHaveBeenCalledOnce();
  });

  it('distinguishes empty filter results from an empty hub', () => {
    useSkillStore.getState().reset();
    render(
      <SkillGrid
        skills={[]}
        tools={[]}
        isLoading={false}
        hasAnyHubSkills
        onRescan={vi.fn()}
        onCreateSkill={vi.fn()}
      />
    );

    expect(screen.getByText('No matching Skills')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Scan' })).toBeNull();
  });
});
