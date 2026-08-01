import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSkillStore } from '@/stores/skillStore';
import type { SkillSummary } from '@/types/skill';
import { SkillTopBar } from './SkillTopBar';

const hubSkill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review code',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  toolStates: {},
};

describe('SkillTopBar', () => {
  beforeEach(() => useSkillStore.getState().reset());
  afterEach(cleanup);

  it('updates name search and favorite filter', () => {
    render(<SkillTopBar />);

    fireEvent.change(screen.getByPlaceholderText('Search Skills by name'), {
      target: { value: 'review' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));

    expect(useSkillStore.getState().filter).toEqual({
      searchQuery: 'review',
      favoritesOnly: true,
    });
  });

  it('exposes rescan, create, and upload actions', () => {
    const onCreate = vi.fn();
    const onUpload = vi.fn();
    const onRescan = vi.fn();
    render(
      <SkillTopBar onCreate={onCreate} onUpload={onUpload} onRescan={onRescan} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    fireEvent.click(screen.getByRole('button', { name: 'New Skill' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload Skill' }));

    expect(onRescan).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenCalledOnce();
    expect(screen.getByText('Check again').className).toContain('md:inline');
  });

  it('places a text-only quick switch action inside the search field', () => {
    const onQuickSwitch = vi.fn();
    render(<SkillTopBar onQuickSwitch={onQuickSwitch} />);

    const searchInput = screen.getByPlaceholderText('Search Skills by name');
    const quickSwitch = screen.getByRole('button', { name: 'Quick switch' });

    expect(searchInput.parentElement?.contains(quickSwitch)).toBe(true);
    expect(within(quickSwitch).queryByText('bolt')).toBeNull();

    fireEvent.click(quickSwitch);

    expect(onQuickSwitch).toHaveBeenCalledOnce();
  });

  it('does not render the legacy section switch or settings actions', () => {
    render(<SkillTopBar />);

    expect(screen.queryByRole('button', { name: 'Manage Prompts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sync settings' })).toBeNull();
  });

  it('labels the displayed count as PromptClip Hub Skills', () => {
    useSkillStore.setState({ skills: [hubSkill], filteredSkills: [hubSkill] });

    render(<SkillTopBar />);

    expect(screen.getByText('PromptClip Hub: 1 Skill')).toBeTruthy();
  });
});
