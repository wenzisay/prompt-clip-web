import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentTool, SkillManagerSettings } from '@/types/skill';
import { SkillSettingsModal } from './SkillSettingsModal';

const settings: SkillManagerSettings = {
  schemaVersion: 1,
  defaultSyncMode: 'symlink',
  toolOverrides: {},
  favorites: {},
  customTools: [],
  disabledToolIds: [],
  toolOrder: [],
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
  source: 'builtin',
  enabled: true,
};

function renderModal(overrides: { onSave?: () => void; skillsPath?: string; onRevealStorage?: () => void } = {}) {
  return render(
    <SkillSettingsModal
      isOpen
      settings={settings}
      tools={[tool]}
      skillsPath={overrides.skillsPath ?? '/home/.prompt-clip/skills'}
      onClose={() => undefined}
      onSave={overrides.onSave ?? (() => undefined)}
      onRevealStorage={overrides.onRevealStorage ?? (() => undefined)}
    />
  );
}

describe('SkillSettingsModal', () => {
  afterEach(cleanup);

  it('submits a global default and per-tool override', () => {
    const onSave = vi.fn();
    renderModal({ onSave });

    fireEvent.click(screen.getByRole('button', { name: 'File copy' }));
    fireEvent.change(screen.getByLabelText('Codex'), { target: { value: 'symlink' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    expect(onSave).toHaveBeenCalledWith('copy', { codex: 'symlink' });
  });

  it('shows the skill storage path below each installed tool name', () => {
    renderModal();

    const path = screen.getByText('/home/.codex/skills');

    expect(path.classList.contains('text-xs')).toBe(true);
    expect(path.previousElementSibling?.textContent).toBe('Codex');
  });

  it('renders a sidebar with the sync settings category and a footer save button', () => {
    renderModal();

    // 左侧分类项（默认 en-US 文案，图标 span 与文字共同构成可访问名）
    const navButton = screen.getByRole('button', { name: /Sync settings/ });
    expect(navButton.className).toContain('bg-accent-soft');

    // 保存按钮仍在 footer 中
    const saveButton = screen.getByRole('button', { name: 'Save settings' });
    expect(saveButton.closest('.border-t')).not.toBeNull();
  });

  it('shows the hub storage path and reveals it on the storage tab', () => {
    const onRevealStorage = vi.fn();
    renderModal({ skillsPath: '/home/.prompt-clip/skills', onRevealStorage });

    // 切换到「数据存储」分类
    fireEvent.click(screen.getByRole('button', { name: /Storage/ }));

    // 展示 hub 路径
    expect(screen.getByText('/home/.prompt-clip/skills')).toBeTruthy();

    // 点击「在文件管理器中打开」触发回调
    fireEvent.click(screen.getByRole('button', { name: 'Open in file manager' }));
    expect(onRevealStorage).toHaveBeenCalledOnce();

    // 数据存储分类下不显示「保存设置」按钮
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });

  it('shows a desktop-only hint instead of the path when skillsPath is empty', () => {
    renderModal({ skillsPath: '' });

    fireEvent.click(screen.getByRole('button', { name: /Storage/ }));

    expect(screen.queryByRole('button', { name: 'Open in file manager' })).toBeNull();
    expect(screen.getByText('Storage is available only in the desktop version.')).toBeTruthy();
  });
});
