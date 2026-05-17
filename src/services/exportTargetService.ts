type SaveDialogFilter = { name: string; extensions: string[] };

export async function saveExportBlob(blob: Blob, filename: string): Promise<boolean> {
  const maybeTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (maybeTauri) {
    const dialogPlugin = '@tauri-apps/plugin-dialog';
    const fsPlugin = '@tauri-apps/plugin-fs';
    const { save } = (await import(/* @vite-ignore */ dialogPlugin)) as {
      save: (options: {
        defaultPath: string;
        filters?: SaveDialogFilter[];
      }) => Promise<string | null>;
    };
    const { writeFile } = (await import(/* @vite-ignore */ fsPlugin)) as {
      writeFile: (path: string, data: Uint8Array) => Promise<void>;
    };
    const filters = getSaveDialogFilters(filename);
    const path = await save({
      defaultPath: filename,
      ...(filters.length > 0 ? { filters } : {}),
    });

    if (!path) {
      return false;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(path, bytes);
    return true;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

function getSaveDialogFilters(filename: string): SaveDialogFilter[] {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (extension === 'zip') {
    return [{ name: 'ZIP', extensions: ['zip'] }];
  }

  if (extension === 'json') {
    return [{ name: 'JSON', extensions: ['json'] }];
  }

  if (extension === 'csv') {
    return [{ name: 'CSV', extensions: ['csv'] }];
  }

  return [];
}

export const ExportTargetService = {
  saveExportBlob,
} as const;
