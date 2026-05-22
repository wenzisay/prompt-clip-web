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
    expect(markup).toContain('默认关闭');
    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-label="启用历史版本"');
    expect(markup).toContain('bg-surfaceHigh');
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
