import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool, SkillManagerSettings } from '@/types/skill';
import { SkillSettingsModal } from './SkillSettingsModal';

const settings: SkillManagerSettings = {
  schemaVersion: 1,
  defaultSyncMode: 'symlink',
  toolOverrides: {},
  favorites: {},
};
const tool: AgentTool = {
  id: 'codex',
  name: 'Codex',
  installed: true,
  detectionReasons: ['config'],
  configPath: '/home/.codex',
  skillsPath: '/home/.codex/skills',
  targetGroupId: 'codex',
  syncMode: 'inherit',
  effectiveSyncMode: 'symlink',
  copyOnly: false,
  iconId: 'codex',
};

describe('SkillSettingsModal', () => {
  afterEach(cleanup);

  it('submits a global default and per-tool override', () => {
    const onSave = vi.fn();
    render(<SkillSettingsModal isOpen settings={settings} tools={[tool]} onClose={() => undefined} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'File copy' }));
    fireEvent.change(screen.getByLabelText('Codex'), { target: { value: 'symlink' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(onSave).toHaveBeenCalledWith('copy', { codex: 'symlink' });
  });

  it('shows the skill storage path below each installed tool name', () => {
    render(
      <SkillSettingsModal
        isOpen
        settings={settings}
        tools={[tool]}
        onClose={() => undefined}
        onSave={() => undefined}
      />
    );

    const path = screen.getByText('/home/.codex/skills');

    expect(path.classList.contains('text-xs')).toBe(true);
    expect(path.previousElementSibling?.textContent).toBe('Codex');
  });
});
