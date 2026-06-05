import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SideDrawer } from './SideDrawer';

describe('SideDrawer', () => {
  beforeEach(() => {
    localStorage.removeItem('promptclip:drawer-width');
  });

  afterEach(() => {
    cleanup();
  });

  it('uses a wider default drawer width', () => {
    render(
      <SideDrawer isOpen title="测试抽屉" onClose={() => undefined}>
        <p>内容</p>
      </SideDrawer>
    );

    expect(screen.getByRole('dialog').style.width).toBe('560px');
  });

  it('upgrades the legacy default drawer width', () => {
    localStorage.setItem('promptclip:drawer-width', '480');

    render(
      <SideDrawer isOpen title="测试抽屉" onClose={() => undefined}>
        <p>内容</p>
      </SideDrawer>
    );

    expect(screen.getByRole('dialog').style.width).toBe('560px');
  });

  it('keeps a custom stored drawer width', () => {
    localStorage.setItem('promptclip:drawer-width', '640');

    render(
      <SideDrawer isOpen title="测试抽屉" onClose={() => undefined}>
        <p>内容</p>
      </SideDrawer>
    );

    expect(screen.getByRole('dialog').style.width).toBe('640px');
  });
});
