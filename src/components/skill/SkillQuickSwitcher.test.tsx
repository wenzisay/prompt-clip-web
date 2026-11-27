import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillQuickSwitcher } from './SkillQuickSwitcher';

function skill(id: string): SkillSummary {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: id,
    contentHash: `${id}-hash`,
    favoritedAt: null,
    categoryIds: [],
    toolStates: {},
  };
}

describe('SkillQuickSwitcher', () => {
  beforeEach(() => useSkillStore.getState().reset());
  afterEach(cleanup);

  it('filters by name, description, or category and selects with the keyboard', () => {
    const onSelect = vi.fn();
    useSkillStore.setState({
      categories: [{ id: 'c1', name: 'Security', createdAt: '' }],
    });
    const reviewSkill: SkillSummary = {
      ...skill('review-code'),
      description: 'Inspect git diffs carefully',
      categoryIds: ['c1'],
    };
    render(
      <SkillQuickSwitcher
        isOpen
        skills={[skill('write-docs'), reviewSkill]}
        onClose={vi.fn()}
        onSelect={onSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search Skills by name');
    fireEvent.change(input, { target: { value: 'git diffs' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('review-code');

    fireEvent.change(input, { target: { value: 'security' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith('review-code');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <SkillQuickSwitcher
        isOpen
        skills={[skill('review-code')]}
        onClose={onClose}
        onSelect={vi.fn()}
      />
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Search Skills by name'), {
      key: 'Escape',
    });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
