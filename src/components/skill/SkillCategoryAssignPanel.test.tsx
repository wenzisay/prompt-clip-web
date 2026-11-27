import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillCategory, SkillSummary } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillCategoryAssignPanel } from './SkillCategoryAssignPanel';

const baseSkill: SkillSummary = {
  id: 'review-code',
  name: 'review-code',
  description: 'Review code safely',
  relativePath: 'review-code',
  contentHash: 'hash',
  favoritedAt: null,
  categoryIds: [],
  toolStates: {},
};

describe('SkillCategoryAssignPanel', () => {
  const onClose = vi.fn();
  const addCategory = vi.fn();
  const setSkillCategories = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useSkillStore.setState({
      categories: [],
      addCategory,
      setSkillCategories,
    });
  });

  afterEach(cleanup);

  it('shows empty categories hint instead of no-skills message and supports inline create + assign', async () => {
    const created: SkillCategory = {
      id: 'cat-work',
      name: 'Work',
      createdAt: '2026-08-01T00:00:00Z',
    };
    addCategory.mockImplementation(async () => {
      useSkillStore.setState({ categories: [created] });
      return true;
    });
    setSkillCategories.mockResolvedValue(true);

    render(<SkillCategoryAssignPanel skill={baseSkill} onClose={onClose} />);

    expect(screen.queryByText('No Skills in this category yet')).toBeNull();
    expect(screen.getByText('No categories yet')).toBeTruthy();

    const input = screen.getByPlaceholderText('New category name');
    fireEvent.change(input, { target: { value: 'Work' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(addCategory).toHaveBeenCalledWith('Work');
      expect(setSkillCategories).toHaveBeenCalledWith('review-code', ['cat-work']);
    });
  });

  it('shows validation error when creating a duplicate or reserved category name inline', async () => {
    useSkillStore.setState({
      categories: [{ id: 'c1', name: 'Work', createdAt: '2026-08-01T00:00:00Z' }],
    });

    render(<SkillCategoryAssignPanel skill={baseSkill} onClose={onClose} />);

    const input = screen.getByPlaceholderText('New category name');
    fireEvent.change(input, { target: { value: 'work' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Category name already exists')).toBeTruthy();
    expect(addCategory).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Default' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('This name is reserved, please choose another')).toBeTruthy();
    expect(addCategory).not.toHaveBeenCalled();
  });

  it('does not propagate clicks inside the panel to parent card', () => {
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <SkillCategoryAssignPanel skill={baseSkill} onClose={onClose} />
      </div>
    );

    fireEvent.click(screen.getByPlaceholderText('New category name'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
