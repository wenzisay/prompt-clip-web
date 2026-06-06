import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('min-h-[136px]');
    expect(markup).toContain('h-16 w-16');
  });

  it('links feature cards to the about page in web browsers', () => {
    directoryPickerState.isSupported = true;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).toContain('href="/about"');
  });

  it('does not link feature cards in the desktop client', () => {
    directoryPickerState.isSupported = true;
    installTauriRuntime();

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    expect(markup).not.toContain('href="/about"');
  });

  it('renders an unsupported browser warning above the button when file access is unavailable', () => {
    directoryPickerState.isSupported = false;
    directoryPickerState.isLoading = false;
    directoryPickerState.error = null;

    const markup = renderToStaticMarkup(<WelcomeScreen />);

    // Landing page content is still shown
    expect(markup).toContain('Choose data folder');
    expect(markup).toContain('Manage faster');

    // Warning banner appears
    expect(markup).toContain('browser is not supported');

    // Button is disabled
    expect(markup).toContain('disabled');
  });
});
