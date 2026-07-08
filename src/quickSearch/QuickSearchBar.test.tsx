import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickSearchBar } from './QuickSearchBar';
import type { QuickSearchResultItem } from './quickSearchRpc';

const items: QuickSearchResultItem[] = [
  { id: '1', title: 'First', preview: 'p1', tags: ['t1'], pinned: false, copyCount: 0 },
  { id: '2', title: 'Second', preview: 'p2', tags: [], pinned: true, copyCount: 5 },
];

function renderBar(overrides: Partial<React.ComponentProps<typeof QuickSearchBar>> = {}) {
  const props: React.ComponentProps<typeof QuickSearchBar> = {
    query: '',
    results: items,
    selectedIndex: 0,
    isSearching: false,
    placeholder: '搜索…',
    noResultsText: '无结果',
    resultsLabel: '搜索结果',
    recentGroupLabel: '最近使用',
    searchGroupLabel: '搜索结果',
    navigateLabel: '导航',
    pasteLabel: '粘贴',
    closeLabel: '关闭',
    openDetailLabel: '在主应用中打开详情',
    onQueryChange: vi.fn(),
    onSelectIndex: vi.fn(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onOpenDetail: vi.fn(),
    ...overrides,
  };
  render(<QuickSearchBar {...props} />);
  return {
    onQueryChange: props.onQueryChange,
    onSelectIndex: props.onSelectIndex,
    onClose: props.onClose,
    onSubmit: props.onSubmit,
    onOpenDetail: props.onOpenDetail,
  };
}

describe('QuickSearchBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the input and all result items', () => {
    renderBar();
    expect(screen.getByPlaceholderText('搜索…')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('should label empty-query results as recently used', () => {
    renderBar();

    expect(screen.getByText('最近使用')).toBeTruthy();
  });

  it('should label typed-query results as search results', () => {
    renderBar({ query: 'sec' });

    expect(screen.getByText('搜索结果')).toBeTruthy();
  });

  it('should render footer keyboard guidance', () => {
    renderBar();

    expect(screen.getByText('导航')).toBeTruthy();
    expect(screen.getByText('粘贴')).toBeTruthy();
    expect(screen.getByText('关闭')).toBeTruthy();
    expect(screen.getByText('在主应用中打开详情')).toBeTruthy();
  });

  it('should give the result list a scrollable viewport below the input', () => {
    renderBar();

    const list = screen.getByRole('listbox', { name: '搜索结果' });

    expect(list.className).toContain('flex-1');
    expect(list.className).toContain('min-h-0');
    expect(list.className).toContain('overflow-y-auto');
  });

  it('should show no-results text when query has no matches and not searching', () => {
    renderBar({ query: 'xyz', results: [], isSearching: false });
    expect(screen.getByText('无结果')).toBeTruthy();
  });

  it('should not show no-results text while searching', () => {
    renderBar({ query: 'xyz', results: [], isSearching: true });
    expect(screen.queryByText('无结果')).toBeNull();
  });

  it('should call onClose when Escape is pressed', () => {
    const { onClose } = renderBar();
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should move selection down on ArrowDown', () => {
    const { onSelectIndex } = renderBar();
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'ArrowDown' });
    expect(onSelectIndex).toHaveBeenCalledWith(1);
  });

  it('should not move selection beyond the last item', () => {
    const { onSelectIndex } = renderBar({ selectedIndex: 1 });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'ArrowDown' });
    expect(onSelectIndex).toHaveBeenCalledWith(1);
  });

  it('should move selection up on ArrowUp', () => {
    const { onSelectIndex } = renderBar({ selectedIndex: 1 });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'ArrowUp' });
    expect(onSelectIndex).toHaveBeenCalledWith(0);
  });

  it('should not move selection above the first item', () => {
    const { onSelectIndex } = renderBar();
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'ArrowUp' });
    expect(onSelectIndex).toHaveBeenCalledWith(0);
  });

  it('should call onSubmit when Enter is pressed', () => {
    const { onSubmit } = renderBar();
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith(0);
  });

  it('should submit the clicked result item', () => {
    const { onSelectIndex, onSubmit } = renderBar();

    fireEvent.click(screen.getByText('Second'));

    expect(onSelectIndex).toHaveBeenCalledWith(1);
    expect(onSubmit).toHaveBeenCalledWith(1);
  });

  it('should prefix result tag labels with #', () => {
    renderBar();

    expect(screen.getByText('#t1')).toBeTruthy();
  });

  it('should open detail from the result action without submitting the item', () => {
    const { onOpenDetail, onSubmit } = renderBar();

    fireEvent.click(screen.getAllByLabelText('在主应用中打开详情')[0]);

    expect(onOpenDetail).toHaveBeenCalledWith(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should render the detail action as a ghost icon button', () => {
    renderBar();

    const button = screen.getAllByLabelText('在主应用中打开详情')[0];

    expect(button.className).toContain('hover:bg-surface-dim');
    expect(button.className).not.toContain('border');
  });

  it('should call onOpenDetail (not onSubmit) when Cmd+Enter is pressed', () => {
    const { onSubmit, onOpenDetail } = renderBar();
    fireEvent.keyDown(screen.getByPlaceholderText('搜索…'), { key: 'Enter', metaKey: true });
    expect(onOpenDetail).toHaveBeenCalledWith(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should call onQueryChange when typing', () => {
    const { onQueryChange } = renderBar({ results: [] });
    fireEvent.change(screen.getByPlaceholderText('搜索…'), { target: { value: 'hello' } });
    expect(onQueryChange).toHaveBeenCalledWith('hello');
  });
});
