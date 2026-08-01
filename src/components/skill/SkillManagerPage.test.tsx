import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { SkillManagerPage } from './SkillManagerPage';

const mocks = vi.hoisted(() => ({
  deleteSkill: vi.fn(),
  load: vi.fn(),
  rescanExternal: vi.fn(),
  importExternalSelections: vi.fn(),
}));

const skill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review code safely',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  toolStates: {},
};

vi.mock('@/stores/skillStore', () => ({
  useSkillStore: () => ({
    skills: [skill],
    filteredSkills: [skill],
    tools: [],
    isLoading: false,
    load: mocks.load,
    error: null,
    externalScan: null,
    rescanExternal: mocks.rescanExternal,
    importExternalSelections: mocks.importExternalSelections,
    deleteSkill: mocks.deleteSkill,
  }),
}));

vi.mock('./SkillGrid', () => ({
  SkillGrid: ({ onDeleteSkill }: { onDeleteSkill?: (skillId: string) => void }) => (
    <button type="button" onClick={() => onDeleteSkill?.('review-code')}>
      Open delete test
    </button>
  ),
}));

vi.mock('./SkillTopBar', () => ({
  SkillTopBar: () => <div>Skill top bar</div>,
}));

describe('SkillManagerPage deletion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteSkill.mockResolvedValue(true);
  });

  afterEach(cleanup);

  it('opens the delete modal from a card and submits the selected scope', async () => {
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open delete test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Skill' }));

    await waitFor(() => {
      expect(mocks.deleteSkill).toHaveBeenCalledWith('review-code', 'all');
    });
    expect(screen.queryByText('Delete “review-code”?')).toBeNull();
  });
});
