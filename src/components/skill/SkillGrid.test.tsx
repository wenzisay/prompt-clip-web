import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
});
