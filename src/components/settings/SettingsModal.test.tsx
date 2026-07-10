import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Locale } from '@/i18n';
import {
  DEFAULT_QUICK_SEARCH_SHORTCUT,
  useSettingsStore,
} from '@/stores/settingsStore';
import { SettingsModalContent } from './SettingsModal';

const invokeMock = vi.hoisted(() => vi.fn());
const onFocusChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onFocusChanged: onFocusChangedMock,
  }),
}));

function renderSettingsContent(locale: Locale = 'zh-CN') {
  const noop = vi.fn();
  render(
    <SettingsModalContent
      activeTab="general"
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
      locale={locale}
    />
  );
}

describe('SettingsModal', () => {
  afterEach(() => {
    cleanup();
    invokeMock.mockReset();
    onFocusChangedMock.mockReset();
    Reflect.deleteProperty(window.navigator, 'platform');
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    useSettingsStore.setState({
      quickSearchEnabled: true,
      quickSearchShortcut: DEFAULT_QUICK_SEARCH_SHORTCUT,
      shareAuthorName: '',
    });
  });

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

  it('unregisters the global shortcut when starting shortcut recording', async () => {
    invokeMock.mockResolvedValue(undefined);
    renderSettingsContent();

    fireEvent.click(screen.getByText('点击录入'));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('unset_quick_search_shortcut');
    });
    expect(screen.getByText('请按下组合键…')).toBeTruthy();
  });

  it('disables global quick search and unregisters the shortcut', async () => {
    invokeMock.mockResolvedValue(undefined);
    renderSettingsContent();

    fireEvent.click(screen.getByRole('switch', { name: '启用全局搜索框' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('unset_quick_search_shortcut');
    });
    expect(useSettingsStore.getState().quickSearchEnabled).toBe(false);
    expect((screen.getByText('点击录入') as HTMLButtonElement).disabled).toBe(true);
  });

  it('resets the shortcut and exits recording mode', async () => {
    invokeMock.mockResolvedValue(undefined);
    useSettingsStore.setState({ quickSearchShortcut: 'CommandOrControl+K' });
    renderSettingsContent();

    fireEvent.click(screen.getByText('点击录入'));
    await screen.findByText('请按下组合键…');
    fireEvent.click(screen.getByText('恢复默认'));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('set_quick_search_shortcut', {
        shortcut: DEFAULT_QUICK_SEARCH_SHORTCUT,
      });
    });
    expect(screen.getByText('点击录入')).toBeTruthy();
    expect(useSettingsStore.getState().quickSearchShortcut).toBe(DEFAULT_QUICK_SEARCH_SHORTCUT);
  });

  it('refreshes macOS accessibility permission when the window regains focus', async () => {
    let focusChangedHandler: ((event: { payload: boolean }) => void) | null = null;
    let hasPermission = false;
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    onFocusChangedMock.mockImplementation(async (handler) => {
      focusChangedHandler = handler;
      return vi.fn();
    });
    invokeMock.mockImplementation(async (command) => {
      if (command === 'check_paste_permission') {
        return hasPermission;
      }
      return undefined;
    });
    renderSettingsContent();

    expect(await screen.findByText('打开系统设置')).toBeTruthy();
    await waitFor(() => expect(focusChangedHandler).not.toBeNull());

    hasPermission = true;
    act(() => {
      focusChangedHandler?.({ payload: true });
    });

    expect(await screen.findByText(/已授权/)).toBeTruthy();
  });
});
