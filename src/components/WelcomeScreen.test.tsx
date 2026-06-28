import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WelcomeScreen } from './WelcomeScreen';

const directoryPickerState = vi.hoisted(() => ({
  error: null as string | null,
  isLoading: false,
  isSupported: true,
  pendingWorkspace: null as { id: string; name: string; platform: 'web' } | null,
}));

vi.mock('@/hooks/useDirectoryPicker', () => ({
  useDirectoryPicker: () => ({
    isAuthorized: false,
    isSupported: directoryPickerState.isSupported,
    isLoading: directoryPickerState.isLoading,
    error: directoryPickerState.error,
    pendingWorkspace: directoryPickerState.pendingWorkspace,
    openDirectory: vi.fn(),
    clearDirectory: vi.fn(),
  }),
}));

function installTauriRuntime(): void {
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    configurable: true,
    value: {},
  });
}

describe('WelcomeScreen', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  });

  it('renders the landing page content for choosing a data directory', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('Manage faster');
    expect(markup).toContain('Your personal prompt manager');
    expect(markup).toContain('Choose data folder');
    expect(markup).toContain('Local First');
    expect(markup).toContain('File over app');
    expect(markup).toContain('Multi-platform apps');
  });

  it('uses compact feature cards on the landing page', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('min-h-[136px]');
    expect(markup).toContain('h-16 w-16');
  });

  it('keeps the directory button label on one line while icon fonts load', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('shrink-0');
    expect(markup).toContain('whitespace-nowrap');
  });

  it('links feature cards to the about page in web browsers', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('href="/about"');
  });

  it('does not link feature cards in the desktop client', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.pendingWorkspace = null;
    installTauriRuntime();

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).not.toContain('href="/about"');
  });

  it('renders an unsupported browser warning above the button when file access is unavailable', () => {
    directoryPickerState.isSupported = false;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    // Landing page content is still shown
    expect(markup).toContain('Choose data folder');
    expect(markup).toContain('Manage faster');

    // Warning banner appears
    expect(markup).toContain('browser is not supported');

    // Button is disabled
    expect(markup).toContain('disabled');
  });

  it('renders iOS and desktop download links below the directory button on the web', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;
    directoryPickerState.pendingWorkspace = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    // iOS App Store 与 GitHub Release 链接
    expect(markup).toContain('apps.apple.com');
    expect(markup).toContain(
      'https://github.com/wenzisay/prompt-clip-web/releases'
    );
    // 外链安全属性
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    // 品牌 SVG 图标（Apple / GitHub，内联，不受字体子集限制）与全语言一致的文案
    expect(markup).toContain('<svg');
    expect(markup).toContain('iOS App');
  });

  it('does not render the download entry in the desktop client', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.pendingWorkspace = null;
    installTauriRuntime();

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).not.toContain('apps.apple.com');
    expect(markup).not.toContain('prompt-clip-web/releases');
    expect(markup).not.toContain('iOS App');
  });

  it('offers to use the last selected folder when a saved handle needs permission', () => {
    directoryPickerState.isSupported = true;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;
    directoryPickerState.pendingWorkspace = {
      id: 'web:Prompts',
      name: 'Prompts',
      platform: 'web',
    };

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('Use last selected folder');
    expect(markup).not.toContain('Choose data folder');
  });
});
