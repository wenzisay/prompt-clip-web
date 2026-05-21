import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HistoryVersion } from '@/types/prompt';
import { HistoryVersionDetail, HistoryVersionList } from './HistoryModal';

const versions: HistoryVersion[] = [
  {
    filename: '11111111111111111.2026-05-17-020000.md',
    date: new Date(2026, 4, 17, 2, 0, 0),
    editedAt: new Date(2026, 4, 17, 2, 0, 0),
    title: '第二版',
    content: '第二版正文',
    tags: ['工作'],
    copyCount: 1,
    pinned: false,
  },
  {
    filename: '11111111111111111.2026-05-17-010000.md',
    date: new Date(2026, 4, 17, 1, 0, 0),
    editedAt: new Date(2026, 4, 17, 1, 0, 0),
    title: '第一版',
    content: '第一版正文',
    tags: [],
    copyCount: 0,
    pinned: false,
  },
];

describe('HistoryModal display', () => {
  it('renders an empty state when there are no history versions', () => {
    const markup = renderToStaticMarkup(
      <HistoryVersionList
        versions={[]}
        selectedFilename={null}
        onSelect={() => undefined}
      />
    );

    expect(markup).toContain('暂无历史版本');
  });

  it('renders history versions with edited time information', () => {
    const markup = renderToStaticMarkup(
      <HistoryVersionList
        versions={versions}
        selectedFilename={versions[0].filename}
        onSelect={() => undefined}
      />
    );

    expect(markup).toContain('第二版');
    expect(markup).toContain('2026-05-17');
    expect(markup).toContain('02:00');
  });

  it('renders selected version content and actions', () => {
    const markup = renderToStaticMarkup(
      <HistoryVersionDetail
        version={versions[0]}
        copied={false}
        isRestoring={false}
        onCopy={() => undefined}
        onRestore={() => undefined}
      />
    );

    expect(markup).toContain('第二版');
    expect(markup).toContain('第二版正文');
    expect(markup).toContain('复制');
    expect(markup).toContain('恢复');
  });
});
