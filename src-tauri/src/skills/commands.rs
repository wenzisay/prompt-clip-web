use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::{Component, Path, PathBuf};

use super::archive::{
    export_skill_archive, import_skill_archive as import_archive, preview_skill_archive,
};
use super::config::SkillConfigRepository;
use super::detector::detect_tools;
use super::files::{
    create_directory, create_skill, create_text_file, delete_entry, download_file,
    list_skill_files, read_text_file, rename_entry, upload_bytes, upload_file, write_text_file,
};
use super::import::{import_external_skill, ImportDecision, ImportOutcome};
use super::models::{
    AgentTool, ArchivePreview, ExternalScanResult, SkillDeleteMode, SkillFileEntry,
    SkillManagerError, SkillManagerInitialization, SkillScanResponse, SkillSettingsUpdateResult,
    SkillTextFile, SkillTextWriteResult, SkillToolState, SyncMode, SyncOperationResult,
    ToolSyncMode,
};
use super::paths::SkillPaths;
use super::registry::builtin_tool_definitions;
use super::scanner::{scan_external_skills, scan_hub};
use super::sync::{
    force_set_skill_enabled, inspect_target, preserve_managed_target, set_skill_enabled,
};

#[tauri::command]
pub fn skill_initialize() -> Result<SkillManagerInitialization, SkillManagerError> {
    let home_dir = dirs::home_dir().ok_or_else(|| SkillManagerError::new("home_not_found"))?;
    initialize_at(&home_dir, &executable_directories())
}

#[tauri::command]
pub fn skill_detect_tools() -> Result<Vec<AgentTool>, SkillManagerError> {
    Ok(skill_initialize()?.tools)
}

#[tauri::command]
pub fn skill_scan() -> Result<SkillScanResponse, SkillManagerError> {
    let home_dir = home_directory()?;
    scan_at(&home_dir, &executable_directories())
}

#[tauri::command]
pub fn skill_scan_external() -> Result<ExternalScanResult, SkillManagerError> {
    let initialization = skill_initialize()?;
    scan_external_skills(&initialization.tools)
}

#[tauri::command]
pub fn skill_reveal_external(
    target_group_id: String,
    directory_name: String,
) -> Result<(), SkillManagerError> {
    let home_dir = home_directory()?;
    let initialization = initialize_at(&home_dir, &executable_directories())?;
    let path =
        resolve_external_entry_path(&initialization.tools, &target_group_id, &directory_name)?;
    reveal_in_file_manager(&path)
}

#[tauri::command]
pub fn skill_reveal_hub() -> Result<(), SkillManagerError> {
    let paths = initialized_paths()?;
    reveal_in_file_manager(&paths.skills_dir())
}

#[tauri::command]
pub fn skill_set_tool_enabled(
    skill_id: String,
    target_group_id: String,
    enabled: bool,
) -> Result<SyncOperationResult, SkillManagerError> {
    let home_dir = home_directory()?;
    let initialization = initialize_at(&home_dir, &executable_directories())?;
    let mut tools = initialization
        .tools
        .iter()
        .filter(|tool| tool.installed && tool.target_group_id == target_group_id)
        .collect::<Vec<_>>();
    if tools.is_empty() {
        return Err(SkillManagerError::new("skill_target_group_not_found"));
    }
    tools.sort_by(|left, right| left.id.cmp(&right.id));
    let mode = tools[0].effective_sync_mode;
    if tools.iter().any(|tool| tool.effective_sync_mode != mode) {
        return Err(SkillManagerError::new("skill_target_group_mode_conflict"));
    }
    let paths = SkillPaths::new(&home_dir);
    let source = paths.skill_root(&skill_id)?;
    let state = set_skill_enabled(&source, &tools[0].skills_path, &skill_id, mode, enabled)?;
    Ok(SyncOperationResult {
        target_group_id,
        tool_ids: tools.iter().map(|tool| tool.id.clone()).collect(),
        state,
    })
}

#[tauri::command]
pub fn skill_force_enable(
    skill_id: String,
    target_group_id: String,
) -> Result<SyncOperationResult, SkillManagerError> {
    let home_dir = home_directory()?;
    let initialization = initialize_at(&home_dir, &executable_directories())?;
    let mut tools = initialization
        .tools
        .iter()
        .filter(|tool| tool.installed && tool.target_group_id == target_group_id)
        .collect::<Vec<_>>();
    if tools.is_empty() {
        return Err(SkillManagerError::new("skill_target_group_not_found"));
    }
    tools.sort_by(|left, right| left.id.cmp(&right.id));
    let mode = tools[0].effective_sync_mode;
    if tools.iter().any(|tool| tool.effective_sync_mode != mode) {
        return Err(SkillManagerError::new("skill_target_group_mode_conflict"));
    }
    let source = SkillPaths::new(&home_dir).skill_root(&skill_id)?;
    let state = force_set_skill_enabled(&source, &tools[0].skills_path, &skill_id, mode)?;
    Ok(SyncOperationResult {
        target_group_id,
        tool_ids: tools.iter().map(|tool| tool.id.clone()).collect(),
        state,
    })
}

#[tauri::command]
pub fn skill_import_external(
    skill_id: String,
    content_hash: String,
    target_group_id: String,
    decision: ImportDecision,
) -> Result<ImportOutcome, SkillManagerError> {
    let home_dir = home_directory()?;
    let initialization = initialize_at(&home_dir, &executable_directories())?;
    let scan = scan_external_skills(&initialization.tools)?;
    let source = scan
        .groups
        .iter()
        .find(|group| group.name == skill_id)
        .and_then(|group| {
            group
                .versions
                .iter()
                .find(|version| version.content_hash == content_hash)
        })
        .and_then(|version| {
            version
                .sources
                .iter()
                .find(|source| source.target_group_id == target_group_id)
        })
        .ok_or_else(|| SkillManagerError::new("skill_external_version_not_found"))?;
    import_external_skill(
        &source.path,
        &initialization.skills_path,
        &skill_id,
        &content_hash,
        decision,
    )
}

#[tauri::command]
pub fn skill_preview_archive(archive_path: PathBuf) -> Result<ArchivePreview, SkillManagerError> {
    require_absolute_path(&archive_path)?;
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    preview_skill_archive(&archive_path, &paths.temp_dir().join("imports"))
}

#[tauri::command]
pub fn skill_import_archive(
    archive_path: PathBuf,
    decision: ImportDecision,
) -> Result<ImportOutcome, SkillManagerError> {
    require_absolute_path(&archive_path)?;
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    import_archive(
        &archive_path,
        &paths.skills_dir(),
        &paths.temp_dir().join("imports"),
        decision,
    )
}

#[tauri::command]
pub fn skill_export(skill_id: String, destination_path: PathBuf) -> Result<(), SkillManagerError> {
    require_absolute_path(&destination_path)?;
    if !destination_path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zip"))
    {
        return Err(SkillManagerError::new("skill_export_extension_invalid"));
    }
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    let source = paths.skill_root(&skill_id)?;
    export_skill_archive(&source, &destination_path, &skill_id)
}

#[tauri::command]
pub fn skill_set_favorite(
    skill_id: String,
    favorited_at: Option<String>,
) -> Result<super::models::SkillManagerSettings, SkillManagerError> {
    let home_dir = home_directory()?;
    set_favorite_at(&home_dir, &skill_id, favorited_at)
}

#[tauri::command]
pub fn skill_update_settings(
    default_sync_mode: SyncMode,
    tool_overrides: BTreeMap<String, ToolSyncMode>,
) -> Result<SkillSettingsUpdateResult, SkillManagerError> {
    let home_dir = home_directory()?;
    update_settings_at(
        &home_dir,
        &executable_directories(),
        default_sync_mode,
        tool_overrides,
    )
}

#[tauri::command]
pub fn skill_create(skill_id: String, description: String) -> Result<(), SkillManagerError> {
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    create_skill(&paths, &skill_id, &description)
}

#[tauri::command]
pub fn skill_delete(skill_id: String, mode: SkillDeleteMode) -> Result<(), SkillManagerError> {
    let home_dir = home_directory()?;
    delete_skill_at(&home_dir, &executable_directories(), &skill_id, mode)
}

#[tauri::command]
pub fn skill_list_files(skill_id: String) -> Result<Vec<SkillFileEntry>, SkillManagerError> {
    let paths = initialized_paths()?;
    list_skill_files(&paths, &skill_id)
}

#[tauri::command]
pub fn skill_read_text_file(
    skill_id: String,
    relative_path: PathBuf,
) -> Result<SkillTextFile, SkillManagerError> {
    let paths = initialized_paths()?;
    read_text_file(&paths, &skill_id, &relative_path)
}

#[tauri::command]
pub fn skill_write_text_file(
    skill_id: String,
    relative_path: PathBuf,
    content: String,
    expected_modified_at_ms: Option<u64>,
) -> Result<SkillTextWriteResult, SkillManagerError> {
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    let file = write_text_file(
        &paths,
        &skill_id,
        &relative_path,
        &content,
        expected_modified_at_ms,
    )?;
    Ok(SkillTextWriteResult {
        file,
        sync_errors: refresh_copy_targets(&home_dir, &skill_id)?,
    })
}

#[tauri::command]
pub fn skill_create_directory(
    skill_id: String,
    relative_path: PathBuf,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    mutate_and_refresh(&skill_id, |paths| {
        create_directory(paths, &skill_id, &relative_path)
    })
}

#[tauri::command]
pub fn skill_create_text_file(
    skill_id: String,
    relative_path: PathBuf,
) -> Result<SkillTextWriteResult, SkillManagerError> {
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    let file = create_text_file(&paths, &skill_id, &relative_path)?;
    Ok(SkillTextWriteResult {
        file,
        sync_errors: refresh_copy_targets(&home_dir, &skill_id)?,
    })
}

#[tauri::command]
pub fn skill_rename_entry(
    skill_id: String,
    source_relative_path: PathBuf,
    destination_relative_path: PathBuf,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    mutate_and_refresh(&skill_id, |paths| {
        rename_entry(
            paths,
            &skill_id,
            &source_relative_path,
            &destination_relative_path,
        )
    })
}

#[tauri::command]
pub fn skill_upload_file(
    skill_id: String,
    source_path: PathBuf,
    destination_relative_path: PathBuf,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    require_absolute_path(&source_path)?;
    mutate_and_refresh(&skill_id, |paths| {
        upload_file(paths, &skill_id, &source_path, &destination_relative_path)
    })
}

#[tauri::command]
pub fn skill_upload_bytes(
    skill_id: String,
    destination_relative_path: PathBuf,
    content: Vec<u8>,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    mutate_and_refresh(&skill_id, |paths| {
        upload_bytes(paths, &skill_id, &destination_relative_path, &content)
    })
}

#[tauri::command]
pub fn skill_delete_entry(
    skill_id: String,
    relative_path: PathBuf,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    mutate_and_refresh(&skill_id, |paths| {
        delete_entry(paths, &skill_id, &relative_path)
    })
}

#[tauri::command]
pub fn skill_download_file(
    skill_id: String,
    relative_path: PathBuf,
    destination_path: PathBuf,
) -> Result<(), SkillManagerError> {
    require_absolute_path(&destination_path)?;
    let paths = initialized_paths()?;
    download_file(&paths, &skill_id, &relative_path, &destination_path)
}

fn initialize_at(
    home_dir: &Path,
    executable_directories: &[PathBuf],
) -> Result<SkillManagerInitialization, SkillManagerError> {
    let paths = SkillPaths::new(home_dir);
    paths.initialize()?;
    let loaded_settings = SkillConfigRepository::new(&paths).load_or_create()?;
    let tools = detect_tools(home_dir, executable_directories, &loaded_settings.settings);

    Ok(SkillManagerInitialization {
        skills_path: paths.skills_dir(),
        settings: loaded_settings.settings,
        settings_warnings: loaded_settings.warnings,
        tools,
    })
}

fn scan_at(
    home_dir: &Path,
    executable_directories: &[PathBuf],
) -> Result<SkillScanResponse, SkillManagerError> {
    let initialization = initialize_at(home_dir, executable_directories)?;
    let mut hub = scan_hub(&initialization.skills_path)?;
    let installed_tools = initialization
        .tools
        .iter()
        .filter(|tool| tool.installed)
        .collect::<Vec<_>>();
    let mut errors = Vec::new();
    let paths = SkillPaths::new(home_dir);
    for skill in &mut hub.skills {
        skill.favorited_at = initialization.settings.favorites.get(&skill.id).cloned();
        let entry_path = paths.resolve_skill_path(&skill.id, Path::new("SKILL.md"))?;
        let source = entry_path
            .parent()
            .ok_or_else(|| SkillManagerError::new("skill_source_invalid"))?;
        let mut states = BTreeMap::new();
        for tool in &installed_tools {
            match inspect_target(source, &tool.skills_path.join(&skill.id), &skill.id) {
                Ok(state) => {
                    states.insert(
                        tool.id.clone(),
                        SkillToolState {
                            tool_id: tool.id.clone(),
                            target_group_id: tool.target_group_id.clone(),
                            status: state.status,
                            actual_mode: state.actual_mode,
                            message: state.message,
                        },
                    );
                }
                Err(error) => errors.push(error.with_param("toolId", &tool.id)),
            }
        }
        skill.tool_states = states;
    }
    Ok(SkillScanResponse {
        skills_path: initialization.skills_path,
        skills: hub.skills,
        invalid_entries: hub.invalid_entries,
        tools: initialization.tools,
        errors,
    })
}

fn set_favorite_at(
    home_dir: &Path,
    skill_id: &str,
    favorited_at: Option<String>,
) -> Result<super::models::SkillManagerSettings, SkillManagerError> {
    if favorited_at
        .as_deref()
        .is_some_and(|value| value.len() > 64 || !value.ends_with('Z'))
    {
        return Err(SkillManagerError::new("skill_favorite_timestamp_invalid"));
    }
    let paths = SkillPaths::new(home_dir);
    paths.initialize()?;
    let skill_root = paths.skill_root(skill_id)?;
    let metadata = std::fs::symlink_metadata(&skill_root)
        .map_err(|_| SkillManagerError::new("skill_not_found"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(SkillManagerError::new("skill_source_invalid"));
    }
    let repository = SkillConfigRepository::new(&paths);
    let mut settings = repository.load_or_create()?.settings;
    if let Some(timestamp) = favorited_at {
        settings.favorites.insert(skill_id.to_string(), timestamp);
    } else {
        settings.favorites.remove(skill_id);
    }
    repository.save(&settings)?;
    Ok(settings)
}

fn update_settings_at(
    home_dir: &Path,
    executable_directories: &[PathBuf],
    default_sync_mode: SyncMode,
    tool_overrides: BTreeMap<String, ToolSyncMode>,
) -> Result<SkillSettingsUpdateResult, SkillManagerError> {
    let known_ids = builtin_tool_definitions()
        .iter()
        .map(|definition| definition.id)
        .collect::<std::collections::BTreeSet<_>>();
    if tool_overrides
        .keys()
        .any(|tool_id| !known_ids.contains(tool_id.as_str()))
    {
        return Err(SkillManagerError::new("skill_tool_override_invalid"));
    }
    let paths = SkillPaths::new(home_dir);
    paths.initialize()?;
    let repository = SkillConfigRepository::new(&paths);
    let mut settings = repository.load_or_create()?.settings;
    settings.default_sync_mode = default_sync_mode;
    settings.tool_overrides = tool_overrides;
    repository.save(&settings)?;

    let tools = detect_tools(home_dir, executable_directories, &settings);
    let hub = scan_hub(&paths.skills_dir())?;
    let mut migrated_groups = std::collections::BTreeSet::new();
    let mut migration_errors = Vec::new();
    for tool in tools
        .iter()
        .filter(|tool| tool.installed && migrated_groups.insert(tool.target_group_id.clone()))
    {
        for skill in &hub.skills {
            let source = paths.skill_root(&skill.id)?;
            let target = tool.skills_path.join(&skill.id);
            match inspect_target(&source, &target, &skill.id) {
                Ok(state)
                    if matches!(
                        state.status,
                        super::models::SkillToolStatus::Enabled
                            | super::models::SkillToolStatus::Stale
                    ) =>
                {
                    if let Err(error) = set_skill_enabled(
                        &source,
                        &tool.skills_path,
                        &skill.id,
                        tool.effective_sync_mode,
                        true,
                    ) {
                        migration_errors.push(
                            error
                                .with_param("toolId", &tool.id)
                                .with_param("skillId", &skill.id),
                        );
                    }
                }
                Ok(_) => {}
                Err(error) => migration_errors.push(
                    error
                        .with_param("toolId", &tool.id)
                        .with_param("skillId", &skill.id),
                ),
            }
        }
    }
    Ok(SkillSettingsUpdateResult {
        settings,
        migration_errors,
    })
}

fn delete_skill_at(
    home_dir: &Path,
    executable_directories: &[PathBuf],
    skill_id: &str,
    mode: SkillDeleteMode,
) -> Result<(), SkillManagerError> {
    let initialization = initialize_at(home_dir, executable_directories)?;
    let paths = SkillPaths::new(home_dir);
    let source = paths.skill_root(skill_id)?;
    let metadata = fs::symlink_metadata(&source).map_err(|error| {
        SkillManagerError::new("skill_not_found").with_param("message", error.to_string())
    })?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(SkillManagerError::new("skill_source_invalid"));
    }

    let mut processed_groups = std::collections::BTreeSet::new();
    for tool in initialization
        .tools
        .iter()
        .filter(|tool| tool.installed && processed_groups.insert(tool.target_group_id.clone()))
    {
        let target = tool.skills_path.join(skill_id);
        let state = inspect_target(&source, &target, skill_id)?;
        if !matches!(
            state.status,
            super::models::SkillToolStatus::Enabled | super::models::SkillToolStatus::Stale
        ) {
            continue;
        }
        match mode {
            SkillDeleteMode::All => {
                set_skill_enabled(
                    &source,
                    &tool.skills_path,
                    skill_id,
                    tool.effective_sync_mode,
                    false,
                )?;
            }
            SkillDeleteMode::HubOnly => preserve_managed_target(&source, &target, skill_id)?,
        }
    }

    fs::remove_dir_all(&source).map_err(|error| {
        SkillManagerError::new("skill_delete_hub_failed").with_param("message", error.to_string())
    })?;
    let repository = SkillConfigRepository::new(&paths);
    let mut settings = repository.load_or_create()?.settings;
    if settings.favorites.remove(skill_id).is_some() {
        repository.save(&settings)?;
    }
    Ok(())
}

fn home_directory() -> Result<PathBuf, SkillManagerError> {
    dirs::home_dir().ok_or_else(|| SkillManagerError::new("home_not_found"))
}

fn initialized_paths() -> Result<SkillPaths, SkillManagerError> {
    let paths = SkillPaths::new(&home_directory()?);
    paths.initialize()?;
    Ok(paths)
}

fn mutate_and_refresh(
    skill_id: &str,
    mutation: impl FnOnce(&SkillPaths) -> Result<(), SkillManagerError>,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    let home_dir = home_directory()?;
    let paths = SkillPaths::new(&home_dir);
    paths.initialize()?;
    mutation(&paths)?;
    refresh_copy_targets(&home_dir, skill_id)
}

fn refresh_copy_targets(
    home_dir: &Path,
    skill_id: &str,
) -> Result<Vec<SkillManagerError>, SkillManagerError> {
    let initialization = initialize_at(home_dir, &executable_directories())?;
    let source = SkillPaths::new(home_dir).skill_root(skill_id)?;
    let mut refreshed_groups = std::collections::BTreeSet::new();
    let mut errors = Vec::new();
    for tool in initialization.tools.iter().filter(|tool| {
        tool.installed
            && tool.effective_sync_mode == SyncMode::Copy
            && refreshed_groups.insert(tool.target_group_id.clone())
    }) {
        let target = tool.skills_path.join(skill_id);
        match inspect_target(&source, &target, skill_id) {
            Ok(state)
                if matches!(
                    state.status,
                    super::models::SkillToolStatus::Enabled | super::models::SkillToolStatus::Stale
                ) =>
            {
                if let Err(error) =
                    set_skill_enabled(&source, &tool.skills_path, skill_id, SyncMode::Copy, true)
                {
                    errors.push(error.with_param("toolId", &tool.id));
                }
            }
            Ok(_) => {}
            Err(error) => errors.push(error.with_param("toolId", &tool.id)),
        }
    }
    Ok(errors)
}

fn require_absolute_path(path: &Path) -> Result<(), SkillManagerError> {
    if path.is_absolute() {
        Ok(())
    } else {
        Err(SkillManagerError::new("skill_dialog_path_invalid"))
    }
}

fn executable_directories() -> Vec<PathBuf> {
    env::var_os("PATH")
        .map(|value| env::split_paths(&value).collect())
        .unwrap_or_default()
}

fn resolve_external_entry_path(
    tools: &[AgentTool],
    target_group_id: &str,
    directory_name: &str,
) -> Result<PathBuf, SkillManagerError> {
    let mut components = Path::new(directory_name).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err(SkillManagerError::new("skill_external_entry_name_invalid"));
    }
    let tool = tools
        .iter()
        .find(|tool| tool.installed && tool.target_group_id == target_group_id)
        .ok_or_else(|| SkillManagerError::new("skill_target_group_not_found"))?;
    let path = tool.skills_path.join(directory_name);
    fs::symlink_metadata(&path)
        .map_err(|_| SkillManagerError::new("skill_external_entry_not_found"))?;
    Ok(path)
}

fn reveal_in_file_manager(path: &Path) -> Result<(), SkillManagerError> {
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn();

    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("explorer.exe")
        .arg("/select,")
        .arg(path)
        .spawn();

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let result = std::process::Command::new("xdg-open")
        .arg(path.parent().unwrap_or(path))
        .spawn();

    result.map(|_| ()).map_err(|error| {
        SkillManagerError::new("skill_reveal_failed").with_param("message", error.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::{
        delete_skill_at, initialize_at, resolve_external_entry_path, scan_at, set_favorite_at,
        update_settings_at,
    };
    use crate::skills::models::{SkillDeleteMode, SyncMode, ToolSyncMode};
    use std::collections::BTreeMap;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn should_initialize_fixed_hub_settings_and_tool_snapshot() {
        let home = tempdir().expect("home should be created");

        let snapshot = initialize_at(home.path(), &[]).expect("manager should initialize");

        assert_eq!(snapshot.tools.len(), 5);
        assert_eq!(
            snapshot.skills_path,
            home.path().join(".prompt-clip/skills")
        );
        assert!(snapshot.skills_path.is_dir());
        assert!(home
            .path()
            .join(".prompt-clip/skill-manager.json")
            .is_file());
    }

    #[test]
    fn should_scan_hub_and_attach_installed_tool_state() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex directory should be created");
        let skill = home.path().join(".prompt-clip/skills/test-skill");
        fs::create_dir_all(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .expect("SKILL.md should be written");

        let result = scan_at(home.path(), &[]).expect("skills should scan");

        assert_eq!(result.skills.len(), 1);
        assert_eq!(
            result.skills[0].tool_states["codex"].status,
            crate::skills::models::SkillToolStatus::Disabled
        );
    }

    #[test]
    fn should_persist_and_clear_skill_favorite() {
        let home = tempdir().expect("home should be created");
        let skill = home.path().join(".prompt-clip/skills/test-skill");
        fs::create_dir_all(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .expect("SKILL.md should be written");

        set_favorite_at(
            home.path(),
            "test-skill",
            Some("2026-08-01T10:00:00.000Z".to_string()),
        )
        .expect("favorite should save");
        let favorited = scan_at(home.path(), &[]).expect("skills should scan");
        set_favorite_at(home.path(), "test-skill", None).expect("favorite should clear");
        let cleared = scan_at(home.path(), &[]).expect("skills should scan");

        assert_eq!(
            favorited.skills[0].favorited_at.as_deref(),
            Some("2026-08-01T10:00:00.000Z")
        );
        assert_eq!(cleared.skills[0].favorited_at, None);
    }

    #[test]
    fn should_update_global_mode_and_tool_override_without_losing_favorites() {
        let home = tempdir().expect("home should be created");
        let skill = home.path().join(".prompt-clip/skills/test-skill");
        fs::create_dir_all(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .expect("SKILL.md should be written");
        set_favorite_at(home.path(), "test-skill", Some("2026-08-01Z".to_string()))
            .expect("favorite should save");
        let mut overrides = BTreeMap::new();
        overrides.insert("codex".to_string(), ToolSyncMode::Symlink);

        let result = update_settings_at(home.path(), &[], SyncMode::Copy, overrides)
            .expect("settings should update");

        assert_eq!(result.settings.default_sync_mode, SyncMode::Copy);
        assert_eq!(
            result.settings.tool_overrides.get("codex"),
            Some(&ToolSyncMode::Symlink)
        );
        assert!(result.settings.favorites.contains_key("test-skill"));
        assert!(result.migration_errors.is_empty());
    }

    #[test]
    fn should_resolve_only_existing_direct_child_of_detected_skills_path() {
        let home = tempdir().expect("home should be created");
        let entry = home.path().join(".claude/skills/node_modules");
        fs::create_dir_all(&entry).expect("external entry should be created");
        let initialization = initialize_at(home.path(), &[]).expect("manager should initialize");
        let claude = initialization
            .tools
            .iter()
            .find(|tool| tool.id == "claude-code")
            .expect("Claude should be detected");

        let resolved = resolve_external_entry_path(
            &initialization.tools,
            &claude.target_group_id,
            "node_modules",
        )
        .expect("external entry should resolve");

        assert_eq!(resolved, entry);
        assert!(resolve_external_entry_path(
            &initialization.tools,
            &claude.target_group_id,
            "../skills"
        )
        .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn should_migrate_an_enabled_target_when_the_effective_mode_changes() {
        use crate::skills::models::ActualSyncMode;
        use crate::skills::sync::{inspect_target, set_skill_enabled};

        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex should be installed");
        let source = home.path().join(".prompt-clip/skills/test-skill");
        fs::create_dir_all(&source).expect("skill directory should be created");
        fs::write(
            source.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .expect("SKILL.md should be written");
        let target_root = home.path().join(".codex/skills");
        set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Symlink, true)
            .expect("symlink should be enabled");

        let result = update_settings_at(home.path(), &[], SyncMode::Copy, BTreeMap::new())
            .expect("settings should migrate");
        let state = inspect_target(&source, &target_root.join("test-skill"), "test-skill")
            .expect("target should inspect");

        assert!(result.migration_errors.is_empty());
        assert_eq!(state.actual_mode, Some(ActualSyncMode::Copy));
    }

    #[test]
    fn should_delete_hub_and_managed_copy_when_deleting_everywhere() {
        use crate::skills::sync::set_skill_enabled;

        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex should be installed");
        let source = write_test_skill(home.path());
        let target_root = home.path().join(".codex/skills");
        set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, true)
            .expect("managed copy should be enabled");
        set_favorite_at(
            home.path(),
            "test-skill",
            Some("2026-08-01T10:00:00.000Z".to_string()),
        )
        .expect("favorite should save");

        delete_skill_at(home.path(), &[], "test-skill", SkillDeleteMode::All)
            .expect("skill should be deleted everywhere");
        let initialization =
            initialize_at(home.path(), &[]).expect("manager should initialize after deletion");

        assert!(!source.exists());
        assert!(!target_root.join("test-skill").exists());
        assert!(!initialization.settings.favorites.contains_key("test-skill"));
    }

    #[test]
    fn should_keep_copy_target_as_independent_skill_when_deleting_only_hub() {
        use crate::skills::sync::set_skill_enabled;

        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex should be installed");
        let source = write_test_skill(home.path());
        let target_root = home.path().join(".codex/skills");
        set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, true)
            .expect("managed copy should be enabled");

        delete_skill_at(home.path(), &[], "test-skill", SkillDeleteMode::HubOnly)
            .expect("only the Hub skill should be deleted");

        let target = target_root.join("test-skill");
        assert!(!source.exists());
        assert!(target.join("SKILL.md").is_file());
        assert!(!target.join(".promptclip-sync.json").exists());
    }

    #[cfg(unix)]
    #[test]
    fn should_materialize_symlink_when_deleting_only_hub() {
        use crate::skills::sync::set_skill_enabled;

        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex should be installed");
        let source = write_test_skill(home.path());
        let target_root = home.path().join(".codex/skills");
        set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Symlink, true)
            .expect("symlink should be enabled");

        delete_skill_at(home.path(), &[], "test-skill", SkillDeleteMode::HubOnly)
            .expect("symlink should be materialized before deleting Hub");

        let target = target_root.join("test-skill");
        assert!(!source.exists());
        assert!(target.join("SKILL.md").is_file());
        assert!(!fs::symlink_metadata(target)
            .expect("target should exist")
            .file_type()
            .is_symlink());
    }

    #[test]
    fn should_keep_unknown_agent_directory_when_deleting_everywhere() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".codex")).expect("Codex should be installed");
        let source = write_test_skill(home.path());
        let target = home.path().join(".codex/skills/test-skill");
        fs::create_dir_all(&target).expect("unknown target should be created");
        fs::write(target.join("external.txt"), "keep me")
            .expect("unknown target should contain data");

        delete_skill_at(home.path(), &[], "test-skill", SkillDeleteMode::All)
            .expect("Hub deletion should not touch unknown target");

        assert!(!source.exists());
        assert_eq!(
            fs::read_to_string(target.join("external.txt")).expect("unknown target should remain"),
            "keep me"
        );
    }

    fn write_test_skill(home: &std::path::Path) -> std::path::PathBuf {
        let source = home.join(".prompt-clip/skills/test-skill");
        fs::create_dir_all(&source).expect("skill directory should be created");
        fs::write(
            source.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .expect("SKILL.md should be written");
        source
    }
}
