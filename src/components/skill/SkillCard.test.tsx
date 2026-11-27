import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool, SkillSummary } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillCard } from './SkillCard';

const dialogMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => dialogMocks);

const tools: AgentTool[] = [
  {
    id: 'codex',
    name: 'Codex',
    installed: true,
    detectionReasons: ['config'],
    configPath: '/home/.codex',
    skillsPath: '/home/.codex/skills',
    targetGroupId: 'codex-group',
    syncMode: 'inherit',
    effectiveSyncMode: 'copy',
    copyOnly: false,
    iconId: 'codex',
    source: 'builtin',
    enabled: true,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    installed: false,
    detectionReasons: [],
    configPath: '/home/.cursor',
    skillsPath: '/home/.cursor/skills',
    targetGroupId: 'cursor-group',
    syncMode: 'inherit',
    effectiveSyncMode: 'copy',
    copyOnly: false,
    iconId: 'cursor',
    source: 'builtin',
    enabled: true,
  },
];

const manyTools: AgentTool[] = Array.from({ length: 12 }, (_, index) => ({
  ...tools[0],
  id: `agent-${index}`,
  name: `Agent ${index}`,
  iconId: 'codex',
  targetGroupId: `agent-group-${index}`,
}));

const skill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review source code safely',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  categoryIds: [],
  toolStates: {
    codex: {
      toolId: 'codex',
      targetGroupId: 'codex-group',
      status: 'disabled',
      actualMode: null,
      message: null,
    },
  },
};

describe('SkillCard', () => {
  const setToolEnabled = vi.fn();
  const setError = vi.fn();
  const toggleFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSkillStore.setState({ setToolEnabled, setError, toggleFavorite });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows skill metadata and only installed Agent tools', () => {
    render(<SkillCard skill={skill} tools={tools} />);

    expect(screen.getByText('review-code')).toBeTruthy();
    expect(screen.getByText('Review source code safely')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Enable for Codex/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Cursor/ })).toBeNull();
  });

  it('toggles the physical target without opening the card', () => {
    const onOpen = vi.fn();
    render(<SkillCard skill={skill} tools={tools} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: /Enable for Codex/ }));

    expect(setToolEnabled).toHaveBeenCalledWith('review-code', 'codex-group', true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps the status in the accessible name without visible status text', () => {
    render(<SkillCard skill={skill} tools={tools} />);

    expect(screen.getByRole('button', { name: /Enable for Codex · Disabled/ })).toBeTruthy();
    expect(screen.queryByText('Disabled')).toBeNull();
  });

  it('shows status badges for conflict, stale, and broken states only', () => {
    const { rerender } = render(<SkillCard skill={skill} tools={tools} />);
    const disabledTool = screen.getByRole('button', {
      name: /Enable for Codex · Disabled/,
    });

    expect(within(disabledTool).queryByText('remove_circle_outline')).toBeNull();

    const enabled = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'enabled' as const },
      },
    };
    rerender(<SkillCard skill={enabled} tools={tools} />);

    const enabledTool = screen.getByRole('button', {
      name: /Disable for Codex · Enabled/,
    });
    expect(within(enabledTool).queryByText('check_circle')).toBeNull();

    const conflicted = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'conflict' as const },
      },
    };
    rerender(<SkillCard skill={conflicted} tools={tools} />);

    const conflictedTool = screen.getByRole('button', {
      name: /Force overwrite for Codex · Conflict/,
    });
    const warningBadge = within(conflictedTool).getByText('warning');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.parentElement?.className).toContain('inline-flex');

    const stale = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'stale' as const },
      },
    };
    rerender(<SkillCard skill={stale} tools={tools} />);

    const staleTool = screen.getByRole('button', {
      name: /Resync for Codex · Needs sync/,
    });
    expect(within(staleTool).getByText('refresh')).toBeTruthy();

    const broken = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'broken' as const },
      },
    };
    rerender(<SkillCard skill={broken} tools={tools} />);

    const brokenTool = screen.getByRole('button', {
      name: /Repair broken link for Codex · Broken link/,
    });
    expect(within(brokenTool).getByText('error')).toBeTruthy();
  });

  it('resyncs a stale copy instead of disabling it when clicked', () => {
    const stale = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'stale' as const },
      },
    };
    render(<SkillCard skill={stale} tools={tools} />);

    fireEvent.click(screen.getByRole('button', { name: /Resync for Codex · Needs sync/ }));

    expect(setToolEnabled).toHaveBeenCalledWith('review-code', 'codex-group', true);
  });

  it('repairs a broken link only after confirmation', async () => {
    const broken = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'broken' as const },
      },
    };
    dialogMocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<SkillCard skill={broken} tools={tools} />);

    const brokenButton = screen.getByRole('button', {
      name: /Repair broken link for Codex · Broken link/,
    });
    expect((brokenButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(brokenButton);
    await waitFor(() => expect(dialogMocks.confirm).toHaveBeenCalledTimes(1));
    expect(setToolEnabled).not.toHaveBeenCalled();

    fireEvent.click(brokenButton);
    await waitFor(() => {
      expect(dialogMocks.confirm).toHaveBeenCalledTimes(2);
      expect(setToolEnabled).toHaveBeenCalledWith('review-code', 'codex-group', true, true);
    });
  });

  it('moves favorite, export, and delete actions into the more menu', () => {
    const onOpen = vi.fn();
    const onExport = vi.fn();
    const onDelete = vi.fn();
    render(
      <SkillCard
        skill={skill}
        tools={tools}
        onOpen={onOpen}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    expect(screen.queryByRole('button', { name: 'Export ZIP' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export ZIP' }));

    expect(onExport).toHaveBeenCalledWith('review-code');
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('review-code');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps a favorite star visible while favorite changes remain in the menu', () => {
    const favoriteSkill = { ...skill, favoritedAt: '2026-08-01T10:00:00.000Z' };
    render(<SkillCard skill={favoriteSkill} tools={tools} />);

    const card = screen.getByText('review-code').closest('article');
    expect(card?.textContent).toContain('star');
    expect(screen.queryByRole('button', { name: 'Remove Skill from favorites' })).toBeNull();
    const favoriteIcon = within(card as HTMLElement).getByText('star');
    expect(favoriteIcon.className).not.toContain('p-1.5');
    expect(favoriteIcon.parentElement?.className).toContain('h-8');
    expect(favoriteIcon.parentElement?.className).toContain('w-8');

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));

    expect(screen.getByRole('button', { name: 'Remove Skill from favorites' })).toBeTruthy();
  });

  it('keeps Agent tools on one row and exposes overflow through a more menu', () => {
    render(<SkillCard skill={skill} tools={manyTools} />);

    const toolbar = screen.getByTestId('skill-agent-tools');
    expect(toolbar.className).toContain('flex-nowrap');
    expect(screen.getByRole('button', { name: 'More tools' })).toBeTruthy();
  });

  it('keeps hidden tools actionable from the overflow menu', () => {
    const setToolEnabled = vi.fn();
    useSkillStore.setState({ setToolEnabled });
    const manyToolStates = Object.fromEntries(
      manyTools.map((tool) => [
        tool.id,
        {
          toolId: tool.id,
          targetGroupId: tool.targetGroupId,
          status: 'disabled' as const,
          actualMode: null,
          message: null,
        },
      ])
    );

    render(
      <SkillCard
        skill={{ ...skill, toolStates: manyToolStates }}
        tools={manyTools}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More tools' }));

    const menu = screen.getByRole('menu');
    const hiddenTool = within(menu).getByRole('button', { name: /Enable for Agent 7/ });
    fireEvent.click(hiddenTool);

    expect(setToolEnabled).toHaveBeenCalledWith(
      'review-code',
      'agent-group-7',
      true
    );
  });

  it('keeps the overflow menu open after toggling a hidden tool', () => {
    const setToolEnabled = vi.fn();
    useSkillStore.setState({ setToolEnabled });
    const manyToolStates = Object.fromEntries(
      manyTools.map((tool) => [
        tool.id,
        {
          toolId: tool.id,
          targetGroupId: tool.targetGroupId,
          status: 'disabled' as const,
          actualMode: null,
          message: null,
        },
      ])
    );

    render(
      <SkillCard
        skill={{ ...skill, toolStates: manyToolStates }}
        tools={manyTools}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More tools' }));

    const hiddenTool = within(screen.getByRole('menu')).getByRole('button', {
      name: /Enable for Agent 7/,
    });
    fireEvent.click(hiddenTool);

    expect(setToolEnabled).toHaveBeenCalled();
    // Menu must remain open so users can toggle multiple tools in one go.
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('opens the overflow menu when the more button is clicked', () => {
    render(<SkillCard skill={skill} tools={manyTools} />);

    fireEvent.click(screen.getByRole('button', { name: 'More tools' }));

    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('increases the minimum card height by about one third', () => {
    render(<SkillCard skill={skill} tools={tools} />);

    expect(screen.getByText('review-code').closest('article')?.className)
      .toContain('min-h-[254px]');
  });

  it('provides a 44-pixel target for the more actions menu', () => {
    render(<SkillCard skill={skill} tools={tools} />);

    const moreActions = screen.getByRole('button', { name: 'More actions' });
    expect(moreActions.className).toContain('h-11');
    expect(moreActions.className).toContain('w-11');
  });

  it('shows the complete skill description without line clamping', () => {
    render(<SkillCard skill={skill} tools={tools} />);

    expect(screen.getByText('Review source code safely').className)
      .not.toContain('line-clamp');
  });

  it('keeps a conflict unchanged unless the native dialog explicitly confirms', async () => {
    const conflicted = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'conflict' as const },
      },
    };
    dialogMocks.confirm.mockResolvedValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SkillCard skill={conflicted} tools={tools} />);

    fireEvent.click(screen.getByRole('button', { name: /Force overwrite for Codex/ }));

    await waitFor(() => expect(dialogMocks.confirm).toHaveBeenCalled());
    expect(setToolEnabled).not.toHaveBeenCalled();
  });

  it('force enables the target group only after the native dialog confirms', async () => {
    const conflicted = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'conflict' as const },
      },
    };
    dialogMocks.confirm.mockResolvedValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SkillCard skill={conflicted} tools={tools} />);

    fireEvent.click(screen.getByRole('button', { name: /Force overwrite for Codex/ }));

    await waitFor(() => {
      expect(dialogMocks.confirm).toHaveBeenCalledWith(
        expect.stringContaining('review-code'),
        expect.objectContaining({ kind: 'warning' })
      );
      expect(setToolEnabled).toHaveBeenCalledWith(
        'review-code',
        'codex-group',
        true,
        true
      );
    });
  });

  it('keeps the conflict and reports an error when the native dialog fails', async () => {
    const conflicted = {
      ...skill,
      toolStates: {
        codex: { ...skill.toolStates.codex, status: 'conflict' as const },
      },
    };
    dialogMocks.confirm.mockRejectedValue(new Error('native dialog unavailable'));
    render(<SkillCard skill={conflicted} tools={tools} />);

    fireEvent.click(screen.getByRole('button', { name: /Force overwrite for Codex/ }));

    await waitFor(() => expect(setError).toHaveBeenCalled());
    expect(setToolEnabled).not.toHaveBeenCalled();
  });

  describe('categories', () => {
    const categorizedSkill: SkillSummary = { ...skill, categoryIds: ['c1', 'c2'] };

    beforeEach(() => {
      useSkillStore.setState({
        categories: [
          { id: 'c1', name: 'Work', createdAt: '2026-08-01T00:00:00Z' },
          { id: 'c2', name: 'Personal', createdAt: '2026-08-02T00:00:00Z' },
        ],
        setCategoryFilter: vi.fn(),
        setSkillCategories: vi.fn(),
      });
    });

    it('renders category pills and filters on click without opening the card', () => {
      const setCategoryFilter = vi.fn();
      const onOpen = vi.fn();
      useSkillStore.setState({ setCategoryFilter });
      render(<SkillCard skill={categorizedSkill} tools={tools} onOpen={onOpen} />);

      const workCategory = screen.getByText('#Work');
      const categoryList = workCategory.parentElement;

      expect(workCategory).toBeTruthy();
      expect(screen.getByText('#Personal')).toBeTruthy();
      expect(categoryList?.className).toContain('mb-3');

      fireEvent.click(workCategory);
      expect(setCategoryFilter).toHaveBeenCalledWith('c1');
      expect(onOpen).not.toHaveBeenCalled();
    });

    it('truncates pills when more than four categories', () => {
      const manySkill: SkillSummary = {
        ...skill,
        categoryIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      };
      useSkillStore.setState({
        categories: [
          { id: 'c1', name: 'A', createdAt: '' },
          { id: 'c2', name: 'B', createdAt: '' },
          { id: 'c3', name: 'C', createdAt: '' },
          { id: 'c4', name: 'D', createdAt: '' },
          { id: 'c5', name: 'E', createdAt: '' },
        ],
      });
      render(<SkillCard skill={manySkill} tools={tools} />);

      expect(screen.getByText('+1')).toBeTruthy();
    });

    it('opens the assign panel from the card menu', async () => {
      const setSkillCategories = vi.fn();
      useSkillStore.setState({ setSkillCategories });
      render(<SkillCard skill={skill} tools={tools} />);

      fireEvent.click(screen.getByLabelText('More actions'));
      fireEvent.click(screen.getByText('Add to category'));

      // Panel lists categories; toggling one persists.
      expect(screen.getByText('Work')).toBeTruthy();
      fireEvent.click(screen.getByText('Work'));
      await waitFor(() => expect(setSkillCategories).toHaveBeenCalledWith('review-code', ['c1']));
    });
  });

  describe('shared agents-skills visibility and duplicate confirmation', () => {
    const compatCodex: AgentTool = {
      ...tools[0],
      id: 'codex',
      name: 'Codex',
      targetGroupId: 'codex-group',
      readsSharedAgentsSkills: true,
    };
    const claudeTool: AgentTool = {
      ...tools[0],
      id: 'claude-code',
      name: 'Claude Code',
      iconId: 'claude-code',
      targetGroupId: 'claude-group',
      readsSharedAgentsSkills: false,
    };
    const agentsTool: AgentTool = {
      ...tools[0],
      id: 'agents-skills',
      name: 'Agents Skills',
      iconId: 'agents-skills',
      targetGroupId: 'agents-group',
      readsSharedAgentsSkills: false,
    };
    const sharedTools = [claudeTool, compatCodex, agentsTool];

    const sharedEnabledSkill: SkillSummary = {
      ...skill,
      toolStates: {
        codex: {
          toolId: 'codex',
          targetGroupId: 'codex-group',
          status: 'disabled',
          actualMode: null,
          message: null,
        },
        'claude-code': {
          toolId: 'claude-code',
          targetGroupId: 'claude-group',
          status: 'disabled',
          actualMode: null,
          message: null,
        },
        'agents-skills': {
          toolId: 'agents-skills',
          targetGroupId: 'agents-group',
          status: 'enabled',
          actualMode: 'symlink',
          message: null,
        },
      },
    };

    beforeEach(() => {
      useSkillStore.setState({
        filter: { searchQuery: '', favoritesOnly: false, agentToolId: null, category: null },
      });
    });

    it('shows the "From Agents Skills" badge when viewing a compatible agent filter', () => {
      useSkillStore.setState({
        filter: { searchQuery: '', favoritesOnly: false, agentToolId: 'codex', category: null },
      });
      render(<SkillCard skill={sharedEnabledSkill} tools={sharedTools} />);

      const badge = screen.getByTestId('skill-shared-source-badge');
      expect(badge.textContent).toContain('From Agents Skills');
    });

    it('shows the "Also in Agents Skills" badge when enabled in both dedicated and shared directories', () => {
      useSkillStore.setState({
        filter: { searchQuery: '', favoritesOnly: false, agentToolId: 'codex', category: null },
      });
      const bothSkill: SkillSummary = {
        ...sharedEnabledSkill,
        toolStates: {
          ...sharedEnabledSkill.toolStates,
          codex: { ...sharedEnabledSkill.toolStates.codex, status: 'enabled' },
        },
      };
      render(<SkillCard skill={bothSkill} tools={sharedTools} />);

      expect(screen.getByTestId('skill-shared-source-badge').textContent).toContain(
        'Also in Agents Skills'
      );
    });

    it('hides the source badge outside compatible agent filters', () => {
      const { rerender } = render(<SkillCard skill={sharedEnabledSkill} tools={sharedTools} />);
      expect(screen.queryByTestId('skill-shared-source-badge')).toBeNull();

      useSkillStore.setState({
        filter: {
          searchQuery: '',
          favoritesOnly: false,
          agentToolId: 'agents-skills',
          category: null,
        },
      });
      rerender(<SkillCard skill={sharedEnabledSkill} tools={sharedTools} />);
      expect(screen.queryByTestId('skill-shared-source-badge')).toBeNull();
    });

    it('asks for lightweight confirmation before enabling a compatible tool when already active in Agents Skills', async () => {
      dialogMocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      render(<SkillCard skill={sharedEnabledSkill} tools={sharedTools} />);

      const codexButton = screen.getByRole('button', { name: /Enable for Codex · Disabled/ });

      fireEvent.click(codexButton);
      await waitFor(() => expect(dialogMocks.confirm).toHaveBeenCalledTimes(1));
      expect(dialogMocks.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Agents Skills'),
        expect.objectContaining({ kind: 'warning' })
      );
      expect(setToolEnabled).not.toHaveBeenCalled();

      fireEvent.click(codexButton);
      await waitFor(() => {
        expect(dialogMocks.confirm).toHaveBeenCalledTimes(2);
        expect(setToolEnabled).toHaveBeenCalledWith('review-code', 'codex-group', true);
      });
    });

    it('enables incompatible tools directly without duplicate confirmation', () => {
      render(<SkillCard skill={sharedEnabledSkill} tools={sharedTools} />);

      fireEvent.click(screen.getByRole('button', { name: /Enable for Claude Code · Disabled/ }));

      expect(dialogMocks.confirm).not.toHaveBeenCalled();
      expect(setToolEnabled).toHaveBeenCalledWith('review-code', 'claude-group', true);
    });
  });
});
