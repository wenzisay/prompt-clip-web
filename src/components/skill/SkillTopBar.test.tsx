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

  it('updates name search without owning the list filter controls', () => {
    render(<SkillTopBar />);

    fireEvent.change(screen.getByPlaceholderText('Search Skills by name'), {
      target: { value: 'review' },
    });

    expect(useSkillStore.getState().filter.searchQuery).toBe('review');
    expect(screen.queryByRole('button', { name: 'Favorites' })).toBeNull();
  });

  it('exposes rescan, create, and upload actions', () => {
    const onCreate = vi.fn();
    const onUpload = vi.fn();
    const onRescan = vi.fn();
    render(
      <SkillTopBar onCreate={onCreate} onUpload={onUpload} onRescan={onRescan} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }));
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(onRescan).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenCalledOnce();
    expect(screen.getByText('Scan').className).toContain('lg:inline');
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

  it('labels the displayed count as managed Skills', () => {
    useSkillStore.setState({ skills: [hubSkill], filteredSkills: [hubSkill] });

    render(<SkillTopBar />);

    expect(screen.getByText('1 Skill managed')).toBeTruthy();
  });
});
