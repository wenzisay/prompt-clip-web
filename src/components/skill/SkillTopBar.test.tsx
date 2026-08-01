import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  });

  it('labels the displayed count as PromptClip Hub Skills', () => {
    useSkillStore.setState({ skills: [hubSkill], filteredSkills: [hubSkill] });

    render(<SkillTopBar />);

    expect(screen.getByText('PromptClip Hub: 1 Skill')).toBeTruthy();
  });
});
