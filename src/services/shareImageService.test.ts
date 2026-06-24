import { describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { toBlob } from 'html-to-image';
import type { PromptAnnotation } from '@/types/annotation';
import {
  binaryToDataUrl,
  buildShareImageFilename,
  copyBlobToClipboard,
  getShareContentPreview,
  getShareImageRenderOptions,
  renderShareNodeToBlob,
  selectShareAnnotations,
} from './shareImageService';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('shareImageService', () => {
  function makeAnnotation(id: string, text: string): PromptAnnotation {
    return {
      id,
      text,
      attachments: [],
      createdAt: '2026-06-24T00:00:00.000Z',
      updatedAt: '2026-06-24T00:00:00.000Z',
    };
  }

  describe('selectShareAnnotations', () => {
    it('returns an empty list when no ids are selected', () => {
      const annotations = [makeAnnotation('a1', '一'), makeAnnotation('a2', '二')];

      expect(selectShareAnnotations(annotations, [])).toEqual([]);
    });

    it('keeps the original annotation order, not the selection order', () => {
      const annotations = [makeAnnotation('a1', '一'), makeAnnotation('a2', '二'), makeAnnotation('a3', '三')];

      const selected = selectShareAnnotations(annotations, ['a3', 'a1']);

      expect(selected.map((item) => item.id)).toEqual(['a1', 'a3']);
    });

    it('returns every annotation when all ids are selected', () => {
      const annotations = [makeAnnotation('a1', '一'), makeAnnotation('a2', '二')];

      expect(selectShareAnnotations(annotations, ['a1', 'a2'])).toEqual(annotations);
    });

    it('ignores selection ids that no longer exist', () => {
      const annotations = [makeAnnotation('a1', '一')];

      expect(selectShareAnnotations(annotations, ['a1', 'gone']).map((item) => item.id)).toEqual(['a1']);
    });
  });

  describe('binaryToDataUrl', () => {
    it('converts a byte array into a base64 data url', async () => {
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

      const dataUrl = await binaryToDataUrl(data, 'image/png');

      expect(dataUrl).toBe('data:image/png;base64,iVBORw==');
    });
  });

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
