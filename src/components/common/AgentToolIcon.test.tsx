import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getAgentToolIcon } from '@/constants';
import { AgentToolIcon } from './AgentToolIcon';

describe('AgentToolIcon', () => {
  it('keeps a stable intrinsic size before the image is decoded', () => {
    const { container } = render(<AgentToolIcon iconId="codex" />);
    const image = container.querySelector('img');

    expect(image?.getAttribute('width')).toBe('24');
    expect(image?.getAttribute('height')).toBe('24');
    expect(image?.className).toContain('block');
  });

  it('falls back to the generic Agents icon when an asset fails to load', () => {
    const { container } = render(<AgentToolIcon iconId="codex" />);
    const image = container.querySelector('img') as HTMLImageElement;

    fireEvent.error(image);

    expect(image.getAttribute('src')).toBe(getAgentToolIcon('agents-skills'));
  });
});
