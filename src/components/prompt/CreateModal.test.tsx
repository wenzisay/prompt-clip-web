import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import { CreateModal } from './CreateModal';

describe('CreateModal editor mode', () => {
  beforeEach(() => {
    useUIStore.setState({
      modalType: null,
      selectedPromptId: null,
      isDetailOpen: false,
    });
  });

  it('opens prompt content in source edit mode by default', () => {
    useUIStore.setState({ modalType: 'create' });

    const markup = renderToStaticMarkup(<CreateModal />);

    expect(markup).toContain('data-mode="text"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('<textarea');
  });
});
