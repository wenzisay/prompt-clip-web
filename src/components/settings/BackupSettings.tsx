import { useEffect, useState } from 'react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { Button, Spinner } from '@/components/common';
import { CONFIG } from '@/constants/config';
import { messages, type Locale } from '@/i18n';
import {
  BackupConfigService,
  backupWorkspace,
  createWebDavBackupTarget,
  createTauriBackupHashCache,
  restoreWorkspace,
  storeWebDavPassword,
  testWebDavConnection,
  type WebDavTargetConfig,
} from '@/services/backup';
import { fileRepository } from '@/services/fileRepository';
import {
  isTauriRuntime,
  saveTauriWorkspace,
  selectTauriDirectoryForRestore,
} from '@/services/fileRepository/tauriFileRepository';
import { PromptService } from '@/services/promptService';
import { useFileStore } from '@/stores/fileStore';
import { usePromptStore } from '@/stores/promptStore';
import { useTagStore } from '@/stores/tagStore';

interface BackupSettingsProps { locale: Locale; }

type BackupOperation = 'testing' | 'backingUp' | 'restoring';

function emptyConfig(): WebDavTargetConfig {
  const id = crypto.randomUUID();
  return {
    kind: 'webdav', id, name: 'WebDAV', baseUrl: '', username: '',
    remotePath: 'PromptClip', credentialId: `webdav-${id}`,
  };
}

export function BackupSettings({ locale }: BackupSettingsProps) {
  const t = messages[locale].settings;
  const workspace = useFileStore((state) => state.workspace);
  const setWorkspace = useFileStore((state) => state.setWorkspace);
  const setPrompts = usePromptStore((state) => state.setPrompts);
  const setTags = useTagStore((state) => state.setTags);
  const [config, setConfig] = useState<WebDavTargetConfig>(emptyConfig);
  const [password, setPassword] = useState('');
  const [operation, setOperation] = useState<BackupOperation | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isTauriRuntime()) return;
    void BackupConfigService.loadBackupTargetConfig().then((stored) => {
      if (stored) setConfig({ ...stored, name: 'WebDAV' });
    });
  }, []);

  if (!isTauriRuntime()) return <p className="text-sm text-muted">{t.backupDesktopOnly}</p>;

  const persist = async () => {
    if (password) await storeWebDavPassword(config.credentialId, password);
    await BackupConfigService.saveBackupTargetConfig({ ...config, name: 'WebDAV' });
  };
  const run = async (nextOperation: BackupOperation, action: () => Promise<string>) => {
    setOperation(nextOperation); setStatus('');
    try { await persist(); setStatus(await action()); }
    catch (error) { setStatus(formatBackupError(error, locale)); }
    finally { setOperation(null); }
  };
  const handleBackup = () => run('backingUp', async () => {
    if (!workspace) throw new Error(t.backupNoWorkspace);
    const result = await backupWorkspace(
      fileRepository,
      workspace,
      createWebDavBackupTarget(config),
      new Date(),
      createTauriBackupHashCache(config.id, workspace.id)
    );
    return t.backupSucceeded(result.uploaded, result.deleted);
  });
  const handleRestore = () => run('restoring', async () => {
    const destination = await selectTauriDirectoryForRestore();
    if (!destination) return t.backupCancelled;
    const skipPaths = new Set<string>();
    if (await fileRepository.exists(destination, CONFIG.FILE_SYSTEM.CONFIG_FILE)) {
      const shouldOverwrite = await confirm(t.restoreConfigConflict, {
        title: t.restoreConfigConflictTitle,
        kind: 'warning',
        okLabel: t.restoreConfigOverwrite,
        cancelLabel: t.restoreConfigSkip,
      });
      if (!shouldOverwrite) skipPaths.add(CONFIG.FILE_SYSTEM.CONFIG_FILE);
    }
    const result = await restoreWorkspace(
      fileRepository,
      destination,
      createWebDavBackupTarget(config),
      new Date(),
      { skipPaths }
    );
    await saveTauriWorkspace(destination);
    setWorkspace(destination);
    const prompts = await PromptService.loadPrompts(fileRepository, destination);
    await setPrompts(prompts);
    setTags(prompts.flatMap((prompt) => prompt.tags));
    return t.restoreSucceeded(result.restored, result.unchanged, result.skipped);
  });

  return (
    <div>
      <h3 className="text-lg font-semibold text-fg">{t.backupTitle}</h3>
      <p className="mt-1 text-sm text-muted">{t.backupDescription}</p>
      <div className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between border-b border-border pb-4 text-sm">
          <span className="font-medium text-fg">{t.backupName}</span>
          <span className="font-semibold text-accent">WebDAV</span>
        </div>
        <BackupField label={t.backupUrl} value={config.baseUrl} type="url"
          onChange={(baseUrl) => setConfig({ ...config, baseUrl })} />
        <BackupField label={t.backupUsername} value={config.username}
          onChange={(username) => setConfig({ ...config, username })} />
        <BackupField label={t.backupPassword} value={password} type="password"
          placeholder={t.backupPasswordPlaceholder} onChange={setPassword} />
        <BackupField label={t.backupRemotePath} value={config.remotePath}
          onChange={(remotePath) => setConfig({ ...config, remotePath })} />
        {operation && <BackupOperationStatus operation={operation} locale={locale} />}
        {status && <p className="rounded bg-surface-high px-3 py-2 text-sm text-fg">{status}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="secondary" disabled={operation !== null} onClick={() => run('testing', async () => {
            await testWebDavConnection(config); return t.backupConnectionSucceeded;
          })}>{t.backupTestConnection}</Button>
          <Button disabled={operation !== null || !workspace} onClick={handleBackup}>{t.backupNow}</Button>
          <Button variant="secondary" disabled={operation !== null} onClick={handleRestore}>
            {t.backupRestore}
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatBackupError(error: unknown, locale: Locale): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('WEBDAV_REMOTE_DIRECTORY_NOT_FOUND')) {
    return messages[locale].settings.backupRemoteDirectoryNotFound;
  }
  return message;
}

function BackupOperationStatus({ operation, locale }: {
  operation: BackupOperation;
  locale: Locale;
}) {
  const t = messages[locale].settings;
  const label = operation === 'testing'
    ? t.backupTesting
    : operation === 'backingUp'
      ? t.backupInProgress
      : t.restoreInProgress;
  return (
    <div role="status" aria-live="polite" className="rounded-lg bg-accent-soft px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <Spinner size="sm" />
        <span>{label}</span>
      </div>
      <div role="progressbar" aria-label={label}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent/15">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
    </div>
  );
}

interface BackupFieldProps {
  label: string; value: string; onChange: (value: string) => void;
  placeholder?: string; type?: 'text' | 'url' | 'password';
}

function BackupField({ label, value, onChange, placeholder, type = 'text' }: BackupFieldProps) {
  return (
    <label className="block text-sm font-medium text-fg">
      <span className="mb-1 block">{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" />
    </label>
  );
}
