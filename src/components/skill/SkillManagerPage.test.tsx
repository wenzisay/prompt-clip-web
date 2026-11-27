import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalScanResult, SkillSummary } from '@/types/skill';
import { useUIStore } from '@/stores/uiStore';
import { SkillManagerPage } from './SkillManagerPage';
import type { SkillDetailPageHandle } from './SkillDetailPage';

const mocks = vi.hoisted(() => ({
  deleteSkill: vi.fn(),
  initialize: vi.fn(),
  create: vi.fn(),
  updateSettings: vi.fn(),
  load: vi.fn(),
  rescanExternal: vi.fn(),
  importExternalSelections: vi.fn(),
  requestNavigateAway: vi.fn((proceed: () => void) => proceed()),
  externalScan: null as ExternalScanResult | null,
}));

const skill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review code safely',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  categoryIds: [],
  toolStates: {},
};

const secondSkill: SkillSummary = {
  ...skill,
  id: 'write-docs',
  name: 'write-docs',
  description: 'Write clean docs',
  relativePath: 'write-docs',
};

const buildStoreState = () => ({
  skills: [skill, secondSkill],
  filteredSkills: [skill, secondSkill],
  tools: [],
  categories: [],
  skillsPath: '/home/.prompt-clip/skills',
  isLoading: false,
  load: mocks.load,
  error: null,
  externalScan: mocks.externalScan,
  rescanExternal: mocks.rescanExternal,
  importExternalSelections: mocks.importExternalSelections,
  deleteSkill: mocks.deleteSkill,
});

vi.mock('@/stores/skillStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/skillStore')>(
    '@/stores/skillStore'
  );
  const useSkillStore = (selector?: (state: ReturnType<typeof buildStoreState>) => unknown) => {
    const state = buildStoreState();
    return selector ? selector(state) : state;
  };
  useSkillStore.getState = () => buildStoreState();
  return {
    matchesSkillQuery: actual.matchesSkillQuery,
    useSkillStore,
  };
});

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
  SkillTopBar: ({
    onCreate,
    onRescan,
  }: {
    onCreate?: () => void;
    onRescan?: () => void;
  }) => (
    <div>
      <span>Skill top bar</span>
      <button type="button" onClick={onCreate}>
        Trigger create
      </button>
      <button type="button" onClick={onRescan}>
        Trigger rescan
      </button>
    </div>
  ),
}));

vi.mock('./SkillDetailPage', () => ({
  SkillDetailPage: forwardRef<
    SkillDetailPageHandle,
    { skillId: string; onBack?: () => void; onSaved?: () => void }
  >(function MockSkillDetailPage({ skillId, onBack, onSaved }, ref) {
    useImperativeHandle(ref, () => ({
      requestNavigateAway: mocks.requestNavigateAway,
    }));
    return (
      <div>
        <span>Skill detail: {skillId}</span>
        <button type="button" onClick={onSaved}>
          Trigger save in detail
        </button>
        <button type="button" onClick={onBack}>
          Trigger back from detail
        </button>
      </div>
    );
  }),
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
    create: mocks.create,
    updateSettings: mocks.updateSettings,
  },
}));

describe('SkillManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.externalScan = null;
    useUIStore.setState({ toasts: [] });
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

  it('shows a specific error toast when creating a duplicate skill', async () => {
    mocks.create.mockRejectedValue({ code: 'skill_already_exists', params: {} });
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger create' }));
    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'review-code' } });
    fireEvent.change(screen.getByLabelText('Skill description'), {
      target: { value: 'Duplicate skill' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create and open' }));

    await waitFor(() => {
      expect(useUIStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            message: 'A Skill with this name already exists. Please choose another name.',
          }),
        ])
      );
    });
  });

  it('shows an info toast when rescan finds no external skills', async () => {
    mocks.rescanExternal.mockImplementation(async () => {
      mocks.externalScan = { groups: [], invalidEntries: [] };
    });
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger rescan' }));

    await waitFor(() => {
      expect(useUIStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'info',
            message: 'Scan complete. No external Skills found to import.',
          }),
        ])
      );
    });
  });

  it('reports settings migration partial failure via toast instead of window.alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    mocks.updateSettings.mockResolvedValue({
      settings: { defaultSyncMode: 'symlink', toolOverrides: {}, favorites: {} },
      migrationErrors: [{ code: 'skill_symlink_permission_denied', params: {} }],
    });
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Shared Skill sidebar' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(useUIStore.getState().toasts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            message: 'Saved, but some copy targets could not be refreshed.',
          }),
        ])
      );
    });
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('reloads hub summaries when returning from detail after saving a file', () => {
    render(<SkillManagerPage />);
    mocks.load.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Open skill detail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger save in detail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger back from detail' }));

    expect(mocks.load).toHaveBeenCalledOnce();
  });

  it('guards quick switching to another skill when in detail view', () => {
    mocks.requestNavigateAway.mockImplementationOnce(() => {
      // 模拟用户取消放弃未保存修改
    });
    render(<SkillManagerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Open skill detail' }));
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.click(screen.getByText('write-docs'));

    expect(mocks.requestNavigateAway).toHaveBeenCalledOnce();
    expect(screen.getByText('Skill detail: review-code')).toBeTruthy();
  });
});
