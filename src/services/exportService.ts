/**
 * Prompt 导出服务
 */

import JSZip from 'jszip';
import type { Prompt } from '@/types/prompt';
import { serializeMarkdown } from '@/utils/markdown';
import { filenameFromId } from '@/utils/id';
import { ExportTargetService } from './exportTargetService';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export async function exportJSON(prompts: Prompt[]): Promise<boolean> {
  const data = prompts.map(toSerializablePrompt);
  return ExportTargetService.saveExportBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }),
    `promptclip-export-${formatExportDate()}.json`
  );
}

export async function exportCSV(prompts: Prompt[]): Promise<boolean> {
  const rows = [
    ['id', 'title', 'content', 'tags', 'created_at', 'updated_at', 'copy_count', 'pinned'],
    ...prompts.map((prompt) => [
      prompt.id,
      prompt.title,
      prompt.content,
      prompt.tags.join('/'),
      prompt.createdAt.toISOString(),
      prompt.updatedAt.toISOString(),
      String(prompt.copyCount),
      String(prompt.pinned),
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCSVCell).join(',')).join('\n');
  return ExportTargetService.saveExportBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `promptclip-export-${formatExportDate()}.csv`
  );
}

export async function exportMDArchive(prompts: Prompt[]): Promise<boolean> {
  const zip = new JSZip();

  for (const prompt of prompts) {
    const markdown = serializeMarkdown(prompt.content, {
      title: prompt.title,
      tags: prompt.tags,
      created: prompt.createdAt.toISOString(),
      modified: prompt.updatedAt.toISOString(),
      copyCount: prompt.copyCount,
      pinned: prompt.pinned,
    });
    zip.file(filenameFromId(prompt.id), markdown);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return ExportTargetService.saveExportBlob(blob, `promptclip-export-${formatExportDate()}.zip`);
}

export async function exportPrompts(prompts: Prompt[], format: ExportFormat): Promise<boolean> {
  if (format === 'json') {
    return exportJSON(prompts);
  }

  if (format === 'csv') {
    return exportCSV(prompts);
  }

  return exportMDArchive(prompts);
}

function toSerializablePrompt(prompt: Prompt) {
  return {
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
    tags: prompt.tags,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
    copyCount: prompt.copyCount,
    pinned: prompt.pinned,
  };
}

function escapeCSVCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatExportDate(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export const ExportService = {
  exportJSON,
  exportCSV,
  exportMDArchive,
  exportPrompts,
} as const;
