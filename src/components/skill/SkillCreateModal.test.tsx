import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillCreateModal } from './SkillCreateModal';

describe('SkillCreateModal', () => {
  afterEach(cleanup);

  it('rejects invalid names before confirming', () => {
    const onConfirm = vi.fn();
    render(
      <SkillCreateModal isOpen onClose={() => undefined} onConfirm={onConfirm} />
    );

    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'Bad Name' } });
    fireEvent.change(screen.getByLabelText('Skill description'), { target: { value: 'Description' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and open' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('The Skill name is invalid.')).toBeTruthy();
  });

  it('confirms a normalized valid name and description', () => {
    const onConfirm = vi.fn();
    render(
      <SkillCreateModal isOpen onClose={() => undefined} onConfirm={onConfirm} />
    );

    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'review-code' } });
    fireEvent.change(screen.getByLabelText('Skill description'), { target: { value: ' Review code ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create and open' }));

    expect(onConfirm).toHaveBeenCalledWith('review-code', 'Review code');
  });
});
