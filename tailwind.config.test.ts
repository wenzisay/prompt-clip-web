import { describe, expect, it } from 'vitest';
import tailwindConfig from './tailwind.config.js';

describe('Tailwind content paths', () => {
  it('includes browser extension source files', () => {
    expect(tailwindConfig.content).toContain('./extension/src/**/*.{js,ts,jsx,tsx}');
  });
});
