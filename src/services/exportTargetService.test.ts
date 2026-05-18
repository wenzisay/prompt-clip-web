import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveExportBlob } from './exportTargetService';

const saveMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: saveMock,
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeFile: writeFileMock,
}));

describe('saveExportBlob', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses a JSON filter for json export filenames', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    saveMock.mockResolvedValue('/tmp/export.json');

    const saved = await saveExportBlob(new Blob(['{}']), 'export.json');

    expect(saved).toBe(true);
    expect(saveMock).toHaveBeenCalledWith({
      defaultPath: 'export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    expect(writeFileMock).toHaveBeenCalledWith('/tmp/export.json', expect.any(Uint8Array));
  });

  it('returns false when the native save dialog is cancelled', async () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    saveMock.mockResolvedValue(null);

    const saved = await saveExportBlob(new Blob(['{}']), 'export.json');

    expect(saved).toBe(false);
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
