import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import { ToastHost } from './ToastHost';

describe('ToastHost', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  afterEach(cleanup);

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastHost />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toasts by type and removes one when dismissed', () => {
    useUIStore.setState({
      toasts: [
        { id: 't1', type: 'success', message: 'Skill exported.', duration: 0 },
        { id: 't2', type: 'error', message: 'A Skill with this name already exists.', duration: 0 },
        { id: 't3', type: 'info', message: 'No new external Skills found.', duration: 0 },
      ],
    });

    render(<ToastHost />);

    expect(screen.getByText('Skill exported.')).toBeTruthy();
    expect(screen.getByText('A Skill with this name already exists.')).toBeTruthy();
    expect(screen.getByText('No new external Skills found.')).toBeTruthy();

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[0]);

    expect(screen.queryByText('Skill exported.')).toBeNull();
    expect(screen.getByText('A Skill with this name already exists.')).toBeTruthy();
  });
});
