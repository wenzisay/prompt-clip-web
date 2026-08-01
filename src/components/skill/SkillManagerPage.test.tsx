import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { SkillManagerPage } from './SkillManagerPage';

const mocks = vi.hoisted(() => ({
  deleteSkill: vi.fn(),
  initialize: vi.fn(),
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
  SkillGrid: ({
    onDeleteSkill,
    onOpenSkill,
  }: {
    onDeleteSkill?: (skillId: string) => void;
    onOpenSkill?: (skillId: string) => void;
  }) => (
    <>
      <button type="button" onClick={() => onDeleteSkill?.('review-code')}>
        Open delete test
      </button>
      <button type="button" onClick={() => onOpenSkill?.('review-code')}>
        Open skill detail
      </button>
    </>
  ),
}));

vi.mock('./SkillTopBar', () => ({
  SkillTopBar: () => <div>Skill top bar</div>,
}));

vi.mock('./SkillDetailPage', () => ({
  SkillDetailPage: ({ skillId }: { skillId: string }) => (
    <div>Skill detail: {skillId}</div>
  ),
}));

vi.mock('@/components/layout', () => ({
  Sidebar: ({ onSkillSettings }: { onSkillSettings?: () => void }) => (
    <button type="button" onClick={onSkillSettings}>
      Shared Skill sidebar
    </button>
  ),
}));

vi.mock('@/services/skillService', () => ({
  SkillService: {
    initialize: mocks.initialize,
  },
}));

describe('SkillManagerPage deletion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteSkill.mockResolvedValue(true);
    mocks.initialize.mockResolvedValue({
      settings: { defaultSyncMode: 'copy', toolOverrides: {}, favorites: {} },
    });
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

  it('renders the shared sidebar and opens Skill settings from it', async () => {
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Shared Skill sidebar' }));

    await waitFor(() => expect(mocks.initialize).toHaveBeenCalledOnce());
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('keeps the shared sidebar visible on a Skill detail page', () => {
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open skill detail' }));

    expect(screen.getByRole('button', { name: 'Shared Skill sidebar' })).toBeTruthy();
    expect(screen.getByText('Skill detail: review-code')).toBeTruthy();
  });
});
