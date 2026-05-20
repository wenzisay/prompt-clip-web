import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeScreen } from './WelcomeScreen';

const directoryPickerState = vi.hoisted(() => ({
  error: null as string | null,
  isLoading: false,
  isSupported: true,
}));

vi.mock('@/hooks/useDirectoryPicker', () => ({
  useDirectoryPicker: () => ({
    isAuthorized: false,
    isSupported: directoryPickerState.isSupported,
    isLoading: directoryPickerState.isLoading,
    error: directoryPickerState.error,
    openDirectory: vi.fn(),
    clearDirectory: vi.fn(),
  }),
}));

describe('WelcomeScreen', () => {
  it('renders the landing page content for choosing a data directory', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('高效管理');
    expect(markup).toContain('你的个人 Prompt 管理工具');
    expect(markup).toContain('选择数据目录');
    expect(markup).toContain('本地存储');
    expect(markup).toContain('快速访问');
    expect(markup).toContain('Markdown 支持');
  });

  it('uses compact feature cards on the landing page', () => {
    directoryPickerState.isSupported = true;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('min-h-[136px]');
    expect(markup).toContain('h-16 w-16');
  });

  it('renders an unsupported browser warning above the button when file access is unavailable', () => {
    directoryPickerState.isSupported = false;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    // Landing page content is still shown
    expect(markup).toContain('选择数据目录');
    expect(markup).toContain('高效管理');

    // Warning banner appears
    expect(markup).toContain('浏览器不支持');

    // Button is disabled
    expect(markup).toContain('disabled');
  });
});
