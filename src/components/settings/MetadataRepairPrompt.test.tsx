import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMetadataRepairStore } from '@/stores/metadataRepairStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { MetadataRepairPrompt } from './MetadataRepairPrompt';

describe('MetadataRepairPrompt', () => {
  afterEach(() => {
    cleanup();
    useMetadataRepairStore.getState().reset();
  });

  it('lets the user ignore detected metadata issues for this session', () => {
    useSettingsStore.getState().setLocale('zh-CN');
    useMetadataRepairStore.getState().show({
      totalMarkdownFiles: 1,
      healthyFiles: 0,
      repairableFiles: 1,
      issues: [{
        path: 'external.md',
        title: 'External',
        missingFields: ['title'],
        invalidFields: [],
      }],
    });
    render(<MetadataRepairPrompt onRepair={vi.fn()} onViewDetails={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '本次忽略' }));

    expect(useMetadataRepairStore.getState().isOpen).toBe(false);
  });
});
