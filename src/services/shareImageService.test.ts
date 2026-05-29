import { describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { toBlob } from 'html-to-image';
import {
  buildShareImageFilename,
  copyBlobToClipboard,
  getShareContentPreview,
  getShareImageRenderOptions,
  renderShareNodeToBlob,
} from './shareImageService';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('shareImageService', () => {
  it('truncates share content to 2000 characters', () => {
    const preview = getShareContentPreview(`${'一'.repeat(2000)}后续内容`);

    expect(preview.content).toHaveLength(2000);
    expect(preview.isTruncated).toBe(true);
  });

  it('keeps short share content unchanged', () => {
    const preview = getShareContentPreview('短内容');

    expect(preview).toEqual({
      content: '短内容',
      isTruncated: false,
    });
  });

  it('builds a safe png filename from the prompt title', () => {
    expect(buildShareImageFilename('A/B: Prompt?')).toBe('A-B-Prompt.png');
  });

  it('uses render options that avoid font embedding failures', () => {
    expect(getShareImageRenderOptions()).toMatchObject({
      backgroundColor: '#ffffff',
      cacheBust: true,
      pixelRatio: 1,
      skipFonts: true,
    });
  });

  it('reports unsupported clipboard image copying clearly', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    const clipboard = {
      write: undefined,
    };

    await expect(copyBlobToClipboard(blob, clipboard)).rejects.toThrow('clipboard');
  });

  it('copies a png blob with the ClipboardItem API', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    const write = vi.fn().mockResolvedValue(undefined);
    const ClipboardItem = vi.fn();

    await copyBlobToClipboard(blob, { write }, ClipboardItem as unknown as typeof globalThis.ClipboardItem);

    expect(ClipboardItem).toHaveBeenCalledWith({ 'image/png': blob });
    expect(write).toHaveBeenCalledWith([expect.any(ClipboardItem)]);
  });

  it('falls back to html2canvas when html-to-image fails', async () => {
    const expectedBlob = new Blob(['fallback'], { type: 'image/png' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const node = {
      querySelectorAll: () => [],
      scrollWidth: 896,
      scrollHeight: 600,
    } as unknown as HTMLElement;

    vi.mocked(toBlob).mockRejectedValueOnce(new Event('error'));
    vi.mocked(html2canvas).mockResolvedValueOnce({
      toBlob: (callback: BlobCallback) => callback(expectedBlob),
    } as HTMLCanvasElement);

    await expect(renderShareNodeToBlob(node)).resolves.toBe(expectedBlob);
    expect(warnSpy).toHaveBeenCalledWith(
      'html-to-image failed, falling back to html2canvas:',
      expect.any(Event)
    );
    expect(html2canvas).toHaveBeenCalledWith(
      node,
      expect.objectContaining({
        backgroundColor: '#ffffff',
        height: 600,
        scale: 1,
        useCORS: true,
        width: 896,
        windowHeight: 600,
        windowWidth: 896,
      })
    );
    warnSpy.mockRestore();
  });
});
