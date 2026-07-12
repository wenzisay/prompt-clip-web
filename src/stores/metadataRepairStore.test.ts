import { describe, expect, it } from 'vitest';
import { useMetadataRepairStore } from './metadataRepairStore';

const result = {
  totalMarkdownFiles: 1,
  healthyFiles: 0,
  repairableFiles: 1,
  issues: [{
    path: 'external.md',
    title: 'External',
    missingFields: ['title' as const],
    invalidFields: [],
  }],
};

describe('metadataRepairStore', () => {
  it('does not show ignored paths again during the same session', () => {
    useMetadataRepairStore.getState().show(result);
    expect(useMetadataRepairStore.getState().isOpen).toBe(true);

    useMetadataRepairStore.getState().ignoreCurrent();
    useMetadataRepairStore.getState().show(result);

    expect(useMetadataRepairStore.getState().isOpen).toBe(false);
    useMetadataRepairStore.getState().reset();
  });
});
