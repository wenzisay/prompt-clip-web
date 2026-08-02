import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSkillStore } from '@/stores/skillStore';
import { SkillFilterTabs } from './SkillFilterTabs';

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
});
