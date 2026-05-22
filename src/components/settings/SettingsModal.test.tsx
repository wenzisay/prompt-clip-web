import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SettingsModalContent } from './SettingsModal';

describe('SettingsModal', () => {
  it('renders general and about sections', () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(
      <SettingsModalContent
        activeTab="general"
        historySettings={{
          enabled: false,
          retentionDays: 30,
        }}
        isSaveDisabled={false}
        isSaving={false}
        onCancel={noop}
        onChangeHistorySettings={noop}
        onReset={noop}
        onSave={noop}
        onSelectTab={noop}
      />
    );

    expect(markup).toContain('通用');
    expect(markup).toContain('关于');
    expect(markup).toContain('历史版本');
    expect(markup).toContain('文件夹维护');
    expect(markup).toContain('扫描元数据');
    expect(markup).toContain('默认关闭');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-label="启用历史版本"');
    expect(markup).toContain('bg-surfaceHigh');
  });

  it('renders metadata scan result', () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(
      <SettingsModalContent
        activeTab="general"
        historySettings={{
          enabled: false,
          retentionDays: 30,
        }}
        isRepairingMetadata={false}
        isSaveDisabled={false}
        isSaving={false}
        isScanningMetadata={false}
        metadataScanResult={{
          totalMarkdownFiles: 2,
          healthyFiles: 1,
          repairableFiles: 1,
          issues: [
            {
              path: 'obsidian.md',
              title: 'Obsidian Prompt',
              missingFields: ['id', 'title'],
              invalidFields: [],
            },
          ],
        }}
        onCancel={noop}
        onChangeHistorySettings={noop}
        onRepairMetadata={noop}
        onReset={noop}
        onSave={noop}
        onScanMetadata={noop}
        onSelectTab={noop}
      />
    );

    expect(markup).toContain('共扫描 2 个 Markdown 文件');
    expect(markup).toContain('1 个文件需要补全');
    expect(markup).toContain('obsidian.md');
    expect(markup).toContain('补全缺失元数据');
  });

  it('limits metadata issue preview to 1000 files', () => {
    const noop = vi.fn();
    const issues = Array.from({ length: 1001 }, (_, index) => ({
      path: `file-${index}.md`,
      title: `File ${index}`,
      missingFields: ['id' as const],
      invalidFields: [],
    }));
    const markup = renderToStaticMarkup(
      <SettingsModalContent
        activeTab="general"
        historySettings={{
          enabled: false,
          retentionDays: 30,
        }}
        isRepairingMetadata={false}
        isSaveDisabled={false}
        isSaving={false}
        isScanningMetadata={false}
        metadataScanResult={{
          totalMarkdownFiles: 1001,
          healthyFiles: 0,
          repairableFiles: 1001,
          issues,
        }}
        onCancel={noop}
        onChangeHistorySettings={noop}
        onRepairMetadata={noop}
        onReset={noop}
        onSave={noop}
        onScanMetadata={noop}
        onSelectTab={noop}
      />
    );

    expect(markup).toContain('file-999.md');
    expect(markup).not.toContain('file-1000.md');
    expect(markup).toContain('列表最多显示前');
    expect(markup).toContain('1000');
  });

  it('renders about copy', () => {
    const noop = vi.fn();
    const markup = renderToStaticMarkup(
      <SettingsModalContent
        activeTab="about"
        historySettings={{
          enabled: false,
          retentionDays: 30,
        }}
        isSaveDisabled={false}
        isSaving={false}
        onCancel={noop}
        onChangeHistorySettings={noop}
        onReset={noop}
        onSave={noop}
        onSelectTab={noop}
      />
    );

    expect(markup).toContain('关于 PromptClip');
    expect(markup).toContain('本地优先');
    expect(markup).toContain('.promptclip.json');
  });
});
