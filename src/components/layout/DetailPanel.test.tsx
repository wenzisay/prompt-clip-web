import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HistoryAction } from './DetailPanel';

describe('DetailPanel history action', () => {
  it('hides the history button when history versions are disabled', () => {
    const markup = renderToStaticMarkup(
      <HistoryAction isHistoryEnabled={false} onOpen={vi.fn()} />
    );

    expect(markup).not.toContain('aria-label="查看历史版本"');
  });

  it('shows the history button when history versions are enabled', () => {
    const markup = renderToStaticMarkup(
      <HistoryAction isHistoryEnabled onOpen={vi.fn()} />
    );

    expect(markup).toContain('aria-label="查看历史版本"');
  });
});
