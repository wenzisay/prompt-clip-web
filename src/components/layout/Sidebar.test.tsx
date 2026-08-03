import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from './Sidebar';

const runtime = vi.hoisted(() => ({ isDesktop: true }));

vi.mock('@/services/fileRepository/tauriFileRepository', () => ({
  isTauriRuntime: () => runtime.isDesktop,
}));

vi.mock('@/components/tag/TagTree', () => ({
  TagTree: () => <div>Prompt tag tree</div>,
}));

describe('Sidebar section navigation', () => {
  beforeEach(() => {
    runtime.isDesktop = true;
    useUIStore.setState({ appSection: 'prompts', modalType: null });
  });

  afterEach(cleanup);

  it('switches between Prompt and Skill sections in the desktop client', () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Prompts' }).getAttribute('aria-current'))
      .toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Skills' }));

    expect(useUIStore.getState().appSection).toBe('skills');
  });

  it('does not expose Skill navigation in the web app', () => {
    runtime.isDesktop = false;

    render(<Sidebar />);

    expect(screen.queryByRole('button', { name: 'Prompts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skills' })).toBeNull();
  });

  it('keeps Prompt-only resources and settings in the Prompt section', () => {
    render(<Sidebar />);

    expect(screen.getByText('Prompt tag tree')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recycle Bin' })).toBeTruthy();
    expect(screen.getByText('Data is stored locally')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));

    expect(useUIStore.getState().modalType).toBe('settings');
  });

  it('hides Prompt resources and opens Skill settings in the Skill section', () => {
    const onSkillSettings = vi.fn();
    useUIStore.setState({ appSection: 'skills' });

    render(<Sidebar onSkillSettings={onSkillSettings} />);

    expect(screen.queryByText('Prompt tag tree')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recycle Bin' })).toBeNull();
    expect(screen.queryByText('Data is stored locally')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onSkillSettings).toHaveBeenCalledOnce();
  });

  it('delegates section selection to onSelectSection when provided', () => {
    const onSelectSection = vi.fn();
    render(<Sidebar onSelectSection={onSelectSection} />);

    fireEvent.click(screen.getByRole('button', { name: 'Skills' }));

    // 走外部处理器（用于未保存修改确认），而非直接改 store
    expect(onSelectSection).toHaveBeenCalledWith('skills');
    expect(useUIStore.getState().appSection).toBe('prompts');
  });
});

describe('Sidebar Skills agents list', () => {
  const codex: AgentTool = {
    id: 'codex',
    name: 'Codex',
    installed: true,
    detectionReasons: ['config'],
    configPath: '/home/.codex',
    skillsPath: '/home/.codex/skills',
    targetGroupId: 'shared',
    syncMode: 'inherit',
    effectiveSyncMode: 'copy',
    copyOnly: false,
    iconId: 'codex',
    source: 'builtin',
    enabled: true,
  };
  const cursor: AgentTool = { ...codex, id: 'cursor', name: 'Cursor', iconId: 'cursor' };
  const notInstalled: AgentTool = { ...codex, id: 'windsurf', name: 'Windsurf', installed: false };

  beforeEach(() => {
    runtime.isDesktop = true;
    useUIStore.setState({ appSection: 'skills', modalType: null });
    useSkillStore.getState().reset();
  });

  afterEach(cleanup);

  it('lists only installed agents in the Skills section', () => {
    useSkillStore.setState({ tools: [codex, cursor, notInstalled] });

    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Codex' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cursor' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Windsurf' })).toBeNull();
  });

  it('selects an agent and highlights it, then clears on second click', () => {
    useSkillStore.setState({ tools: [codex] });

    render(<Sidebar />);

    fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
    expect(useSkillStore.getState().filter.agentToolId).toBe('codex');
    expect(screen.getByRole('button', { name: 'Codex' }).getAttribute('aria-pressed')).toBe(
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Codex' }));
    expect(useSkillStore.getState().filter.agentToolId).toBeNull();
  });

  it('shows an empty hint when no agent is installed', () => {
    useSkillStore.setState({ tools: [notInstalled] });

    render(<Sidebar />);

    expect(screen.getByText('No installed agents detected')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Windsurf' })).toBeNull();
  });
});
