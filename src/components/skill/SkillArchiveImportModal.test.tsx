import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillArchiveImportModal } from './SkillArchiveImportModal';

const preview = {
  skillId: 'review-code',
  name: 'review-code',
  description: 'Review code',
  contentHash: 'abc',
  entryCount: 2,
  expandedSize: 128,
};

describe('SkillArchiveImportModal', () => {
  afterEach(cleanup);

  it('lets the user keep the Hub version when an archive conflicts', () => {
    const onConfirm = vi.fn();
    render(
      <SkillArchiveImportModal
        isOpen
        preview={preview}
        hasConflict
        onClose={() => undefined}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByLabelText('Keep PromptClip version'));
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(onConfirm).toHaveBeenCalledWith('keepHub');
  });
});
