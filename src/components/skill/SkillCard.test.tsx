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

  it('shows a status badge only when the Agent tool is in conflict', () => {
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
});
