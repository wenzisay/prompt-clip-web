use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt;
use std::path::PathBuf;

/// Static definition for one supported Agent skill target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ToolDefinition {
    pub id: &'static str,
    pub name: &'static str,
    pub config_dir: &'static str,
    pub alternative_config_dirs: &'static [&'static str],
    pub cli_command: Option<&'static str>,
    pub copy_only: bool,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SyncMode {
    Symlink,
    Copy,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolSyncMode {
    Inherit,
    Symlink,
    Copy,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ActualSyncMode {
    Symlink,
    Junction,
    Copy,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SkillDeleteMode {
    All,
    HubOnly,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SkillToolStatus {
    Disabled,
    Enabled,
    Stale,
    Broken,
    Conflict,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TargetState {
    pub status: SkillToolStatus,
    pub actual_mode: Option<ActualSyncMode>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillToolState {
    pub tool_id: String,
    pub target_group_id: String,
    pub status: SkillToolStatus,
    pub actual_mode: Option<ActualSyncMode>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DetectionReason {
    Config,
    Cli,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentTool {
    pub id: String,
    pub name: String,
    pub installed: bool,
    pub detection_reasons: Vec<DetectionReason>,
    pub config_path: PathBuf,
    pub skills_path: PathBuf,
    pub target_group_id: String,
    pub sync_mode: ToolSyncMode,
    pub effective_sync_mode: SyncMode,
    pub copy_only: bool,
    pub icon_id: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillManagerInitialization {
    pub skills_path: PathBuf,
    pub settings: SkillManagerSettings,
    pub settings_warnings: Vec<String>,
    pub tools: Vec<AgentTool>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub relative_path: String,
    pub content_hash: String,
    pub favorited_at: Option<String>,
    pub tool_states: BTreeMap<String, SkillToolState>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct InvalidSkillEntry {
    pub directory_name: String,
    pub error: SkillManagerError,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HubScanResult {
    pub skills: Vec<SkillSummary>,
    pub invalid_entries: Vec<InvalidSkillEntry>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSkillSource {
    pub target_group_id: String,
    pub tool_ids: Vec<String>,
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalInvalidSkillEntry {
    pub directory_name: String,
    pub error: SkillManagerError,
    pub source: ExternalSkillSource,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSkillVersion {
    pub description: String,
    pub content_hash: String,
    pub modified_at_ms: u64,
    pub uses_lowercase_entry: bool,
    pub sources: Vec<ExternalSkillSource>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSkillGroup {
    pub duplicate_key: String,
    pub name: String,
    pub versions: Vec<ExternalSkillVersion>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExternalScanResult {
    pub groups: Vec<ExternalSkillGroup>,
    pub invalid_entries: Vec<ExternalInvalidSkillEntry>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ArchivePreview {
    pub skill_id: String,
    pub name: String,
    pub description: String,
    pub content_hash: String,
    pub entry_count: usize,
    pub expanded_size: u64,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillScanResponse {
    pub skills_path: PathBuf,
    pub skills: Vec<SkillSummary>,
    pub invalid_entries: Vec<InvalidSkillEntry>,
    pub tools: Vec<AgentTool>,
    pub errors: Vec<SkillManagerError>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncOperationResult {
    pub target_group_id: String,
    pub tool_ids: Vec<String>,
    pub state: TargetState,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillFileEntry {
    pub name: String,
    pub relative_path: String,
    pub is_directory: bool,
    pub is_text: bool,
    pub is_markdown: bool,
    pub size: u64,
    pub modified_at_ms: u64,
    pub children: Vec<SkillFileEntry>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillTextFile {
    pub relative_path: String,
    pub content: String,
    pub modified_at_ms: u64,
    pub is_markdown: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillTextWriteResult {
    pub file: SkillTextFile,
    pub sync_errors: Vec<SkillManagerError>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillSettingsUpdateResult {
    pub settings: SkillManagerSettings,
    pub migration_errors: Vec<SkillManagerError>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillManagerSettings {
    pub schema_version: u32,
    pub default_sync_mode: SyncMode,
    pub tool_overrides: BTreeMap<String, ToolSyncMode>,
    pub favorites: BTreeMap<String, String>,
}

impl Default for SkillManagerSettings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            default_sync_mode: SyncMode::Symlink,
            tool_overrides: BTreeMap::new(),
            favorites: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SkillManagerError {
    pub code: String,
    pub params: BTreeMap<String, String>,
}

impl SkillManagerError {
    pub fn new(code: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            params: BTreeMap::new(),
        }
    }

    pub fn with_param(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.params.insert(name.into(), value.into());
        self
    }
}

impl fmt::Display for SkillManagerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.code)
    }
}

impl std::error::Error for SkillManagerError {}

#[cfg(test)]
mod tests {
    use super::{SkillManagerError, SkillManagerSettings, SyncMode, ToolSyncMode};
    use serde_json::json;

    #[test]
    fn should_default_to_symlink_without_tool_overrides() {
        let settings = SkillManagerSettings::default();

        assert_eq!(settings.default_sync_mode, SyncMode::Symlink);
        assert!(settings.tool_overrides.is_empty());
        assert!(settings.favorites.is_empty());
    }

    #[test]
    fn should_serialize_settings_with_camel_case_fields() {
        let mut settings = SkillManagerSettings::default();
        settings
            .tool_overrides
            .insert("codex".to_string(), ToolSyncMode::Copy);

        assert_eq!(
            serde_json::to_value(settings).expect("settings should serialize"),
            json!({
                "schemaVersion": 1,
                "defaultSyncMode": "symlink",
                "toolOverrides": {"codex": "copy"},
                "favorites": {}
            })
        );
    }

    #[test]
    fn should_serialize_stable_error_code_and_parameters() {
        let error = SkillManagerError::new("invalid_path").with_param("path", "../outside");

        assert_eq!(
            serde_json::to_value(error).expect("error should serialize"),
            json!({
                "code": "invalid_path",
                "params": {"path": "../outside"}
            })
        );
    }
}
