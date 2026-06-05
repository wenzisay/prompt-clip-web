import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Locale } from '@/i18n';
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
        shareAuthorName="周文超"
        onCancel={noop}
        onChangeShareAuthorName={noop}
        onChangeLocale={noop}
        onChangeHistorySettings={noop}
        onReset={noop}
        onSave={noop}
        onSelectTab={noop}
        locale="zh-CN"
      />
    );

    expect(markup).toContain('通用');
    expect(markup).toContain('关于');
    expect(markup).toContain('历史版本');
    expect(markup).toContain('文件夹维护');
    expect(markup).toContain('语言');
    expect(markup).toContain('分享作者');
    expect(markup).toContain('value="周文超"');
    expect(markup).toContain('value="zh-CN" selected=""');
    expect(markup).toContain('value="en-US"');
    expect(markup).toContain('中文');
    expect(markup).toContain('English');
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
        shareAuthorName=""
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
        onChangeShareAuthorName={noop}
        onChangeLocale={noop}
        onChangeHistorySettings={noop}
        onRepairMetadata={noop}
        onReset={noop}
        onSave={noop}
        onScanMetadata={noop}
        onSelectTab={noop}
        locale="zh-CN"
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
        shareAuthorName=""
        isScanningMetadata={false}
        metadataScanResult={{
          totalMarkdownFiles: 1001,
          healthyFiles: 0,
          repairableFiles: 1001,
          issues,
        }}
        onCancel={noop}
        onChangeShareAuthorName={noop}
        onChangeLocale={noop}
        onChangeHistorySettings={noop}
        onRepairMetadata={noop}
        onReset={noop}
        onSave={noop}
        onScanMetadata={noop}
        onSelectTab={noop}
        locale="zh-CN"
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
        shareAuthorName=""
        onCancel={noop}
        onChangeShareAuthorName={noop}
        onChangeLocale={noop}
        onChangeHistorySettings={noop}
        onReset={noop}
        onSave={noop}
        onSelectTab={noop}
        locale="zh-CN"
      />
    );

    expect(markup).toContain('为 AI 时代而构建的个人 Prompt 工作空间');
    expect(markup).toContain('File over app / 文件，高于应用');
    expect(markup).toContain('快速记录，便捷检索，持续复用，长期演化');
    expect(markup).toContain('工具可能会消失，数据永远属于你');
  });

  it('renders settings in English', () => {
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
        shareAuthorName="Alex"
        onCancel={noop}
        onChangeShareAuthorName={noop}
        onChangeLocale={noop}
        onChangeHistorySettings={noop}
        onReset={noop}
        onSave={noop}
        onSelectTab={noop}
        locale={'en-US' satisfies Locale}
      />
    );

    expect(markup).toContain('General');
    expect(markup).toContain('About');
    expect(markup).toContain('Language');
    expect(markup).toContain('Share author');
    expect(markup).toContain('value="Alex"');
    expect(markup).toContain('History versions');
    expect(markup).toContain('Folder maintenance');
    expect(markup).toContain('Scan metadata');
    expect(markup).toContain('Save settings');
    expect(markup).toContain('中文');
    expect(markup).toContain('English');
    expect(markup).not.toContain('Chinese');
    expect(markup).not.toContain('通用设置');
  });
});
