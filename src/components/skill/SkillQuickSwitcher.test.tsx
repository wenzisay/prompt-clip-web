import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillSummary } from '@/types/skill';
import { SkillQuickSwitcher } from './SkillQuickSwitcher';

function skill(id: string): SkillSummary {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: id,
    contentHash: `${id}-hash`,
    favoritedAt: null,
    toolStates: {},
  };
}

describe('SkillQuickSwitcher', () => {
  afterEach(cleanup);

  it('filters by name and selects with the keyboard', () => {
    const onSelect = vi.fn();
    render(
      <SkillQuickSwitcher
        isOpen
        skills={[skill('write-docs'), skill('review-code')]}
        onClose={vi.fn()}
        onSelect={onSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search Skills by name');
    fireEvent.change(input, { target: { value: 'review' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('review-code');
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
