import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SkillCategory } from '@/types/skill';
import { useSkillStore } from '@/stores/skillStore';
import { SkillCategoryTree } from './SkillCategoryTree';

const categories: SkillCategory[] = [
  { id: 'c1', name: 'Work', createdAt: '2026-08-01T00:00:00Z' },
  { id: 'c2', name: 'Personal', createdAt: '2026-08-02T00:00:00Z' },
];

describe('SkillCategoryTree', () => {
  beforeEach(() => {
    useSkillStore.getState().reset();
    useSkillStore.setState({
      categories,
      categoryCounts: { c1: 2, c2: 1, __default__: 3 },
    });
  });

  afterEach(cleanup);

  it('renders default category pinned on top plus user categories with counts', () => {
    render(<SkillCategoryTree />);

    expect(screen.getByText('Default')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); // default count
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // Work count
    expect(screen.getByText('1')).toBeTruthy(); // Personal count
  });

  it('selects a category on click and highlights it, then toggles off', () => {
    render(<SkillCategoryTree />);

    fireEvent.click(screen.getByText('Work'));
    expect(useSkillStore.getState().filter.category).toBe('c1');

    fireEvent.click(screen.getByText('Work'));
    expect(useSkillStore.getState().filter.category).toBeNull();
  });

  it('selects the default category via its reserved id', () => {
    render(<SkillCategoryTree />);

    fireEvent.click(screen.getByText('Default'));
    expect(useSkillStore.getState().filter.category).toBe('__default__');
  });

  it('opens the add-category modal from the + button', () => {
    render(<SkillCategoryTree />);

    fireEvent.click(screen.getByRole('button', { name: 'New category' }));

    // Modal renders the category name label input
    expect(screen.getByText('Category name')).toBeTruthy();
  });

  it('opens rename modal from the row actions menu', () => {
    render(<SkillCategoryTree />);

    // Two more_horiz menus exist (one per user row); target the first user row's actions.
    const menus = screen.getAllByLabelText('More actions');
    fireEvent.click(menus[0]);
    fireEvent.click(screen.getByText('Rename category'));

    expect(screen.getByText('Category name')).toBeTruthy();
  });

  it('opens delete confirmation from the row actions menu', () => {
    render(<SkillCategoryTree />);

    const menus = screen.getAllByLabelText('More actions');
    fireEvent.click(menus[0]);
    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByText(/Delete the category "Work"/)).toBeTruthy();
  });
});
