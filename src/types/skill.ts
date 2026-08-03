export type SyncMode = 'symlink' | 'copy';
export type ToolSyncMode = 'inherit' | SyncMode;
export type ActualSyncMode = SyncMode | 'junction';
export type SkillToolStatus =
  | 'disabled'
  | 'enabled'
  | 'stale'
  | 'broken'
  | 'conflict'
  | 'pending';
export type ImportDecision = 'keepHub' | 'useExternal' | 'skip';
export type ImportOutcome = 'imported' | 'replaced' | 'keptHub' | 'skipped';
export type SkillDeleteMode = 'all' | 'hubOnly';

export interface SkillManagerError {
  code: string;
  params: Record<string, string>;
}

export type ToolSource = 'builtin' | 'custom';

export interface CustomToolDefinition {
  id: string;
  name: string;
  skillsPath: string;
}

export interface AgentTool {
  id: string;
  name: string;
  installed: boolean;
  detectionReasons: Array<'config' | 'cli'>;
  configPath: string;
  skillsPath: string;
  targetGroupId: string;
  syncMode: ToolSyncMode;
  effectiveSyncMode: SyncMode;
  copyOnly: boolean;
  iconId: string;
  source: ToolSource;
  /** 是否启用：被用户关闭的工具不参与同步、不出现在卡片工具栏与侧边栏。 */
  enabled: boolean;
}

export interface TargetState {
  status: SkillToolStatus;
  actualMode: ActualSyncMode | null;
  message: string | null;
}

export interface SkillToolState extends TargetState {
  toolId: string;
  targetGroupId: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  relativePath: string;
  contentHash: string;
  favoritedAt: string | null;
  toolStates: Record<string, SkillToolState>;
}

export interface InvalidSkillEntry {
  directoryName: string;
  error: SkillManagerError;
}

export interface SkillManagerSettings {
  schemaVersion: number;
  defaultSyncMode: SyncMode;
  toolOverrides: Record<string, ToolSyncMode>;
  favorites: Record<string, string>;
  customTools: CustomToolDefinition[];
  disabledToolIds: string[];
  /** 用户自定义的工具 id 顺序（builtin + custom 全局统一）。空数组表示用默认顺序。 */
  toolOrder: string[];
}

export interface SkillManagerInitialization {
  skillsPath: string;
  settings: SkillManagerSettings;
  settingsWarnings: string[];
  tools: AgentTool[];
}

export interface SkillScanResponse {
  skillsPath: string;
  skills: SkillSummary[];
  invalidEntries: InvalidSkillEntry[];
  tools: AgentTool[];
  errors: SkillManagerError[];
}

export interface SyncOperationResult {
  targetGroupId: string;
  toolIds: string[];
  state: TargetState;
}

export interface ExternalSkillSource {
  targetGroupId: string;
  toolIds: string[];
  path: string;
}

export interface ExternalInvalidSkillEntry {
  directoryName: string;
  error: SkillManagerError;
  source: ExternalSkillSource;
}

export interface ExternalSkillVersion {
  description: string;
  contentHash: string;
  modifiedAtMs: number;
  usesLowercaseEntry: boolean;
  sources: ExternalSkillSource[];
}

export interface ExternalSkillGroup {
  duplicateKey: string;
  name: string;
  versions: ExternalSkillVersion[];
}

export interface ExternalScanResult {
  groups: ExternalSkillGroup[];
  invalidEntries: ExternalInvalidSkillEntry[];
}

export interface ExternalImportSelection {
  skillId: string;
  contentHash: string;
  targetGroupId: string;
  decision: ImportDecision;
}

export interface ArchivePreview {
  skillId: string;
  name: string;
  description: string;
  contentHash: string;
  entryCount: number;
  expandedSize: number;
}

export interface SkillFileEntry {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  isText: boolean;
  isMarkdown: boolean;
  size: number;
  modifiedAtMs: number;
  children: SkillFileEntry[];
}

export interface SkillTextFile {
  relativePath: string;
  content: string;
  modifiedAtMs: number;
  isMarkdown: boolean;
}

export interface SkillTextWriteResult {
  file: SkillTextFile;
  syncErrors: SkillManagerError[];
}

export interface SkillSettingsUpdateResult {
  settings: SkillManagerSettings;
  migrationErrors: SkillManagerError[];
}
