import { describe, expect, it, vi } from 'vitest';
import { createBaseCommands } from './CommandPalette';

describe('CommandPalette base commands', () => {
  it('does not include the import prompts command', () => {
    const commands = createBaseCommands(vi.fn(), vi.fn());

    expect(commands.map((command) => command.label)).not.toContain('导入 Prompts');
  });
});
