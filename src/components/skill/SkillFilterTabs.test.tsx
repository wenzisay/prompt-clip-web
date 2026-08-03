import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentTool } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillFilterTabs } from './SkillFilterTabs';

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

describe('SkillFilterTabs', () => {
  beforeEach(() => useSkillStore.getState().reset());
  afterEach(cleanup);

  it('changes the skill list to favorites from the standalone filter area', () => {
    render(<SkillFilterTabs />);

    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));

    expect(useSkillStore.getState().filter.favoritesOnly).toBe(true);
    expect(screen.getByRole('button', { name: 'Favorites' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('marks all as active by default', () => {
    render(<SkillFilterTabs />);

    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows a chip for the selected agent', () => {
    useSkillStore.setState({ tools: [codex], filter: { searchQuery: '', favoritesOnly: false, agentToolId: 'codex' } });

    render(<SkillFilterTabs />);

    expect(screen.getByText('Codex')).toBeTruthy();
    // pill 让位给 chip：全部/收藏此时都不是选中态
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Favorites' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('clears the agent chip when switching to a pill', () => {
    useSkillStore.setState({ tools: [codex], filter: { searchQuery: '', favoritesOnly: false, agentToolId: 'codex' } });

    render(<SkillFilterTabs />);
    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));

    expect(useSkillStore.getState().filter.agentToolId).toBeNull();
    expect(screen.queryByText('Codex')).toBeNull();
  });
});
