use serde::Deserialize;
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
#[cfg(windows)]
use std::time::{SystemTime, UNIX_EPOCH};

use super::models::{
    CustomToolDefinition, SkillCategory, SkillManagerError, SkillManagerSettings, SyncMode,
    ToolSyncMode,
};
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
struct RawCustomTool {
    id: String,
    name: String,
    skills_path: PathBuf,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RawCategory {
    id: String,
    name: String,
    created_at: String,
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
    #[serde(default)]
    custom_tools: Vec<RawCustomTool>,
    #[serde(default)]
    disabled_tool_ids: BTreeSet<String>,
    #[serde(default)]
    tool_order: Vec<String>,
    #[serde(default)]
    categories: Vec<RawCategory>,
    #[serde(default)]
    skill_categories: BTreeMap<String, Vec<String>>,
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

    // 自定义工具：逐项解析，跳过缺 id/name/skills_path 的非法项并记 warning。
    // 重复 id / 空名 / 空路径在此剔除，保证后续检测逻辑拿到合法集合。
    let mut custom_tools = Vec::new();
    let mut seen_ids = BTreeSet::new();
    for tool in raw.custom_tools {
        if tool.id.trim().is_empty()
            || tool.name.trim().is_empty()
            || tool.skills_path.as_os_str().is_empty()
        {
            warnings.push("invalid_custom_tool_skipped".to_string());
            continue;
        }
        if !seen_ids.insert(tool.id.clone()) {
            warnings.push(format!("duplicate_custom_tool_id:{}", tool.id));
            continue;
        }
        custom_tools.push(CustomToolDefinition {
            id: tool.id,
            name: tool.name,
            skills_path: tool.skills_path,
        });
    }

    // 分类：逐项解析，跳过缺 id/name/created_at 的非法项并记 warning；
    // 重复 id 在此剔除，保证后续逻辑拿到合法集合。
    let valid_category_ids: BTreeSet<String> = raw
        .categories
        .iter()
        .map(|category| category.id.clone())
        .collect();
    let mut categories = Vec::new();
    let mut seen_category_ids = BTreeSet::new();
    for category in raw.categories {
        if category.id.trim().is_empty()
            || category.name.trim().is_empty()
            || category.created_at.trim().is_empty()
        {
            warnings.push("invalid_skill_category_skipped".to_string());
            continue;
        }
        if !seen_category_ids.insert(category.id.clone()) {
            warnings.push(format!("duplicate_skill_category_id:{}", category.id));
            continue;
        }
        categories.push(SkillCategory {
            id: category.id,
            name: category.name,
            created_at: category.created_at,
        });
    }

    // 过滤掉指向不存在分类的 skill_categories 条目，避免脏数据残留。
    let mut skill_categories = BTreeMap::new();
    for (skill_id, category_ids) in raw.skill_categories {
        let filtered: Vec<String> = category_ids
            .into_iter()
            .filter(|id| valid_category_ids.contains(id))
            .collect();
        if filtered.is_empty() {
            warnings.push(format!("orphan_skill_categories:{}", skill_id));
            continue;
        }
        skill_categories.insert(skill_id, filtered);
    }

    Ok(LoadedSettings {
        settings: SkillManagerSettings {
            schema_version: 1,
            default_sync_mode,
            tool_overrides,
            favorites: raw.favorites,
            custom_tools,
            disabled_tool_ids: raw.disabled_tool_ids,
            tool_order: raw.tool_order,
            categories,
            skill_categories,
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

    #[test]
    fn should_round_trip_custom_tools_and_disabled_ids() {
        use crate::skills::models::CustomToolDefinition;
        use std::path::PathBuf;

        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        let repository = SkillConfigRepository::new(&paths);
        let mut settings = repository
            .load_or_create()
            .expect("settings should initialize")
            .settings;
        settings.custom_tools.push(CustomToolDefinition {
            id: "custom-mytool".to_string(),
            name: "MyTool".to_string(),
            skills_path: PathBuf::from("/home/u/.mytool/skills"),
        });
        settings.disabled_tool_ids.insert("codex".to_string());
        settings.tool_order = vec!["codex".to_string(), "custom-mytool".to_string()];

        repository.save(&settings).expect("settings should save");
        let reloaded = repository.load_or_create().expect("settings should reload");

        assert_eq!(reloaded.settings.custom_tools.len(), 1);
        assert_eq!(reloaded.settings.custom_tools[0].id, "custom-mytool");
        assert!(reloaded
            .settings
            .disabled_tool_ids
            .contains("codex"));
        assert_eq!(reloaded.settings.tool_order, settings.tool_order);
    }

    #[test]
    fn should_skip_invalid_custom_tool_entries() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        paths.initialize().expect("hub should initialize");
        fs::write(
            paths.settings_file(),
            r#"{
              "schemaVersion": 1,
              "defaultSyncMode": "symlink",
              "toolOverrides": {},
              "favorites": {},
              "customTools": [
                {"id": "custom-ok", "name": "Ok", "skillsPath": "/tmp/skills"},
                {"id": "", "name": "NoId", "skillsPath": "/tmp/skills"},
                {"id": "custom-ok", "name": "Dup", "skillsPath": "/tmp/skills"}
              ],
              "disabledToolIds": ["codex"]
            }"#,
        )
        .expect("settings should be written");
        let repository = SkillConfigRepository::new(&paths);

        let loaded = repository.load_or_create().expect("settings should load");

        assert_eq!(loaded.settings.custom_tools.len(), 1);
        assert_eq!(loaded.settings.custom_tools[0].id, "custom-ok");
        assert!(loaded
            .settings
            .disabled_tool_ids
            .contains("codex"));
    }
}
