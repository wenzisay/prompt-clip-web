export async function saveExportBlob(blob: Blob, filename: string): Promise<void> {
  const maybeTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (maybeTauri) {
    const dialogPlugin = '@tauri-apps/plugin-dialog';
    const fsPlugin = '@tauri-apps/plugin-fs';
    const { save } = (await import(/* @vite-ignore */ dialogPlugin)) as {
      save: (options: {
        defaultPath: string;
        filters: Array<{ name: string; extensions: string[] }>;
      }) => Promise<string | null>;
    };
    const { writeFile } = (await import(/* @vite-ignore */ fsPlugin)) as {
      writeFile: (path: string, data: Uint8Array) => Promise<void>;
    };
    const path = await save({
      defaultPath: filename,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });

    if (!path) {
      return;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(path, bytes);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ExportTargetService = {
  saveExportBlob,
} as const;
