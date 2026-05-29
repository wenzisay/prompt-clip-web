import { toBlob } from 'html-to-image';
import type { Options } from 'html-to-image/lib/types';
import html2canvas from 'html2canvas';
import { SHARE_CONTENT_CHARACTER_LIMIT } from '@/constants/shareTemplates';

export interface ShareContentPreview {
  content: string;
  isTruncated: boolean;
}

export function getShareContentPreview(content: string): ShareContentPreview {
  if (content.length <= SHARE_CONTENT_CHARACTER_LIMIT) {
    return {
      content,
      isTruncated: false,
    };
  }

  return {
    content: content.slice(0, SHARE_CONTENT_CHARACTER_LIMIT),
    isTruncated: true,
  };
}

export function buildShareImageFilename(title: string): string {
  const safeTitle = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeTitle || 'promptclip-share'}.png`;
}

export function getShareImageRenderOptions(): Options {
  return {
    backgroundColor: '#ffffff',
    cacheBust: true,
    pixelRatio: 1,
    skipFonts: true,
  };
}

export async function renderShareNodeToBlob(node: HTMLElement): Promise<Blob> {
  await waitForNodeImages(node);

  try {
    const blob = await toBlob(node, getShareImageRenderOptions());

    if (blob) {
      return blob;
    }
  } catch (error) {
    console.warn('html-to-image failed, falling back to html2canvas:', error);
  }

  const fallbackBlob = await renderShareNodeWithCanvas(node);

  if (fallbackBlob) {
    return fallbackBlob;
  }

  throw new Error('Failed to generate share image.');
}

async function renderShareNodeWithCanvas(node: HTMLElement): Promise<Blob | null> {
  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff',
    scale: 1,
    useCORS: true,
    width: node.scrollWidth,
    height: node.scrollHeight,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    logging: false,
  });

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png', 1);
  });
}

async function waitForNodeImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll('img'));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      await image.decode().catch(() => undefined);
    })
  );
}

export function downloadBlob(blob: Blob, filename: string, documentRef = document): void {
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyBlobToClipboard(
  blob: Blob,
  clipboard: Pick<Clipboard, 'write'> | { write?: Clipboard['write'] } | undefined =
    navigator.clipboard,
  ClipboardItemCtor: typeof ClipboardItem | undefined = globalThis.ClipboardItem
): Promise<void> {
  if (!clipboard?.write || !ClipboardItemCtor) {
    throw new Error('Image clipboard writing is not supported by this browser.');
  }

  await clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
}

export const ShareImageService = {
  buildShareImageFilename,
  copyBlobToClipboard,
  downloadBlob,
  getShareContentPreview,
  getShareImageRenderOptions,
  renderShareNodeToBlob,
} as const;
