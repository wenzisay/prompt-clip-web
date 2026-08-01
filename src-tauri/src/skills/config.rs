use serde::Deserialize;
use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::time::{SystemTime, UNIX_EPOCH};

use super::models::{SkillManagerError, SkillManagerSettings, SyncMode, ToolSyncMode};
use super::paths::SkillPaths;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadedSettings {
    pub settings: SkillManagerSettings,
    pub warnings: Vec<String>,
}

pub struct SkillConfigRepository {
    settings_file: PathBuf,
}

impl SkillConfigRepository {
    pub fn new(paths: &SkillPaths) -> Self {
        Self {
            settings_file: paths.settings_file(),
        }
    }

    pub fn load_or_create(&self) -> Result<LoadedSettings, SkillManagerError> {
        if !self.settings_file.exists() {
            let settings = SkillManagerSettings::default();
            self.save(&settings)?;
            return Ok(LoadedSettings {
                settings,
                warnings: Vec::new(),
            });
        }

        let content = fs::read_to_string(&self.settings_file)
            .map_err(|error| self.io_error("read_settings_failed", error))?;
        parse_settings(&content).map_err(|error| {
            SkillManagerError::new("invalid_settings")
                .with_param("path", self.settings_file.to_string_lossy())
                .with_param("message", error)
        })
    }

    pub fn save(&self, settings: &SkillManagerSettings) -> Result<(), SkillManagerError> {
        let parent = self
            .settings_file
            .parent()
            .ok_or_else(|| SkillManagerError::new("invalid_settings_path"))?;
        fs::create_dir_all(parent)
            .map_err(|error| self.io_error("create_directory_failed", error))?;
        let content = serde_json::to_vec_pretty(settings).map_err(|error| {
            SkillManagerError::new("serialize_settings_failed")
                .with_param("message", error.to_string())
        })?;
        let temporary_file = self.settings_file.with_extension("json.tmp");
        let mut file = File::create(&temporary_file)
            .map_err(|error| self.io_error("write_settings_failed", error))?;
        file.write_all(&content)
            .and_then(|_| file.sync_all())
            .map_err(|error| self.io_error("write_settings_failed", error))?;

        self.replace_settings_file(&temporary_file)
    }

    fn io_error(&self, code: &str, error: std::io::Error) -> SkillManagerError {
        SkillManagerError::new(code)
            .with_param("path", self.settings_file.to_string_lossy())
            .with_param("message", error.to_string())
    }

    #[cfg(not(windows))]
    fn replace_settings_file(&self, temporary_file: &Path) -> Result<(), SkillManagerError> {
        fs::rename(temporary_file, &self.settings_file)
            .map_err(|error| self.io_error("replace_settings_failed", error))
    }

    #[cfg(windows)]
    fn replace_settings_file(&self, temporary_file: &Path) -> Result<(), SkillManagerError> {
        if !self.settings_file.exists() {
            return fs::rename(temporary_file, &self.settings_file)
                .map_err(|error| self.io_error("replace_settings_failed", error));
        }
        let backup = self.settings_file.with_extension(format!(
            "json.backup-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        fs::rename(&self.settings_file, &backup)
            .map_err(|error| self.io_error("backup_settings_failed", error))?;
        match fs::rename(temporary_file, &self.settings_file) {
            Ok(()) => fs::remove_file(&backup)
                .map_err(|error| self.io_error("remove_settings_backup_failed", error)),
            Err(error) => match fs::rename(&backup, &self.settings_file) {
                Ok(()) => Err(self.io_error("replace_settings_failed", error)),
                Err(rollback_error) => Err(SkillManagerError::new("settings_rollback_failed")
                    .with_param("path", self.settings_file.to_string_lossy())
                    .with_param("message", rollback_error.to_string())),
            },
        }
    }
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RawSettings {
    schema_version: Option<u32>,
    default_sync_mode: Option<String>,
    #[serde(default)]
    tool_overrides: BTreeMap<String, String>,
    #[serde(default)]
    favorites: BTreeMap<String, String>,
}

fn parse_settings(content: &str) -> Result<LoadedSettings, String> {
    let raw: RawSettings = serde_json::from_str(content).map_err(|error| error.to_string())?;
    let mut warnings = Vec::new();
    let default_sync_mode = parse_sync_mode(raw.default_sync_mode.as_deref(), &mut warnings);
    let tool_overrides = raw
        .tool_overrides
        .into_iter()
        .map(|(tool_id, mode)| {
            let parsed = parse_tool_sync_mode(&tool_id, &mode, &mut warnings);
            (tool_id, parsed)
        })
        .collect();

    if raw.schema_version.unwrap_or(1) != 1 {
        warnings.push("unsupported_schema_version".to_string());
    }

    Ok(LoadedSettings {
        settings: SkillManagerSettings {
            schema_version: 1,
            default_sync_mode,
            tool_overrides,
            favorites: raw.favorites,
        },
        warnings,
    })
}

fn parse_sync_mode(value: Option<&str>, warnings: &mut Vec<String>) -> SyncMode {
    match value {
        Some("copy") => SyncMode::Copy,
        Some("symlink") | None => SyncMode::Symlink,
        Some(_) => {
            warnings.push("unknown_default_sync_mode".to_string());
            SyncMode::Symlink
        }
    }
}

fn parse_tool_sync_mode(tool_id: &str, value: &str, warnings: &mut Vec<String>) -> ToolSyncMode {
    match value {
        "inherit" => ToolSyncMode::Inherit,
        "symlink" => ToolSyncMode::Symlink,
        "copy" => ToolSyncMode::Copy,
        _ => {
            warnings.push(format!("unknown_tool_sync_mode:{tool_id}"));
            ToolSyncMode::Inherit
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SkillConfigRepository;
    use crate::skills::models::{SyncMode, ToolSyncMode};
    use crate::skills::paths::SkillPaths;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn should_create_default_settings_when_file_is_missing() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        let repository = SkillConfigRepository::new(&paths);

        let loaded = repository.load_or_create().expect("settings should load");

        assert_eq!(loaded.settings.default_sync_mode, SyncMode::Symlink);
        assert!(paths.settings_file().is_file());
    }

    #[test]
    fn should_round_trip_settings() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        let repository = SkillConfigRepository::new(&paths);
        let mut settings = repository
            .load_or_create()
            .expect("settings should initialize")
            .settings;
        settings.default_sync_mode = SyncMode::Copy;
        settings
            .tool_overrides
            .insert("codex".to_string(), ToolSyncMode::Symlink);

        repository.save(&settings).expect("settings should save");
        let reloaded = repository.load_or_create().expect("settings should reload");

        assert_eq!(reloaded.settings, settings);
    }

    #[test]
    fn should_report_invalid_json_without_overwriting_it() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        paths.initialize().expect("hub should initialize");
        fs::write(paths.settings_file(), "{invalid").expect("invalid settings should be written");
        let repository = SkillConfigRepository::new(&paths);

        let error = repository
            .load_or_create()
            .expect_err("invalid settings should fail");

        assert_eq!(error.code, "invalid_settings");
        assert_eq!(
            fs::read_to_string(paths.settings_file()).expect("settings should remain"),
            "{invalid"
        );
    }

    #[test]
    fn should_fall_back_safely_for_unknown_sync_modes() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        paths.initialize().expect("hub should initialize");
        fs::write(
            paths.settings_file(),
            r#"{
              "schemaVersion": 1,
              "defaultSyncMode": "future-mode",
              "toolOverrides": {"codex": "also-future"},
              "favorites": {}
            }"#,
        )
        .expect("settings should be written");
        let repository = SkillConfigRepository::new(&paths);

        let loaded = repository.load_or_create().expect("settings should load");

        assert_eq!(loaded.settings.default_sync_mode, SyncMode::Symlink);
        assert_eq!(
            loaded.settings.tool_overrides.get("codex"),
            Some(&ToolSyncMode::Inherit)
        );
        assert_eq!(loaded.warnings.len(), 2);
    }
}
