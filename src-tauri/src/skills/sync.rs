use super::models::{ActualSyncMode, SkillManagerError, SkillToolStatus, SyncMode, TargetState};
use super::paths::validate_skill_id;
use super::scanner::compute_skill_hash;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const MANAGEMENT_MARKER: &str = ".promptclip-sync.json";

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CopyMarker {
    schema_version: u32,
    owner: String,
    skill_id: String,
    source_hash: String,
    synced_at: String,
}

pub fn inspect_target(
    source: &Path,
    target: &Path,
    skill_id: &str,
) -> Result<TargetState, SkillManagerError> {
    validate_skill_id(skill_id)?;
    let metadata = match fs::symlink_metadata(target) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return Ok(target_state(SkillToolStatus::Disabled, None, None));
        }
        Err(error) => return Err(io_error("inspect_target", error)),
    };

    if is_link_like(&metadata) {
        return inspect_link(source, target);
    }
    if !metadata.is_dir() {
        return Ok(target_state(
            SkillToolStatus::Conflict,
            None,
            Some("skill_target_not_directory"),
        ));
    }
    inspect_copy(source, target, skill_id)
}

pub fn set_skill_enabled(
    source: &Path,
    target_root: &Path,
    skill_id: &str,
    mode: SyncMode,
    enabled: bool,
) -> Result<TargetState, SkillManagerError> {
    validate_skill_id(skill_id)?;
    ensure_source(source, skill_id)?;
    let target = target_root.join(skill_id);
    let current = inspect_target(source, &target, skill_id)?;

    if !enabled {
        return disable_target(source, &target, skill_id, current);
    }
    match current.status {
        SkillToolStatus::Conflict | SkillToolStatus::Broken => {
            return Err(
                SkillManagerError::new("skill_target_conflict").with_param("skillId", skill_id)
            );
        }
        SkillToolStatus::Enabled if mode_matches(current.actual_mode, mode) => return Ok(current),
        SkillToolStatus::Stale if mode == SyncMode::Copy => {}
        SkillToolStatus::Enabled | SkillToolStatus::Stale => {
            remove_verified_target(source, &target, skill_id, &current)?;
        }
        SkillToolStatus::Disabled => {}
    }

    fs::create_dir_all(target_root).map_err(|error| io_error("create_target_root", error))?;
    match mode {
        SyncMode::Symlink => create_directory_link(source, &target)?,
        SyncMode::Copy => create_managed_copy(source, &target, skill_id)?,
    }
    let verified = inspect_target(source, &target, skill_id)?;
    if verified.status != SkillToolStatus::Enabled {
        return Err(SkillManagerError::new("skill_target_verification_failed")
            .with_param("skillId", skill_id));
    }
    Ok(verified)
}

pub fn force_set_skill_enabled(
    source: &Path,
    target_root: &Path,
    skill_id: &str,
    mode: SyncMode,
) -> Result<TargetState, SkillManagerError> {
    validate_skill_id(skill_id)?;
    ensure_source(source, skill_id)?;
    let target = target_root.join(skill_id);
    let current = inspect_target(source, &target, skill_id)?;
    if !matches!(
        current.status,
        SkillToolStatus::Conflict | SkillToolStatus::Broken
    ) {
        return set_skill_enabled(source, target_root, skill_id, mode, true);
    }

    let metadata =
        fs::symlink_metadata(&target).map_err(|error| io_error("read_force_target", error))?;
    if !is_link_like(&metadata) && !metadata.is_dir() && !metadata.is_file() {
        return Err(SkillManagerError::new("skill_target_special_file"));
    }
    fs::create_dir_all(target_root).map_err(|error| io_error("create_target_root", error))?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let hub_base = source
        .parent()
        .and_then(Path::parent)
        .ok_or_else(|| SkillManagerError::new("skill_source_invalid"))?;
    let backup_root = hub_base.join("temp/conflict-backups");
    fs::create_dir_all(&backup_root)
        .map_err(|error| io_error("create_conflict_backup_root", error))?;
    let backup = backup_root.join(format!("{skill_id}-{unique}"));
    fs::rename(&target, &backup).map_err(|error| io_error("backup_conflicting_target", error))?;

    let replacement = match install_and_verify_target(source, &target, skill_id, mode) {
        Ok(state) => state,
        Err(error) => {
            rollback_force_replacement(&target, &backup)?;
            return Err(error);
        }
    };
    if let Err(error) = remove_entry_without_following(&backup) {
        return Err(SkillManagerError::new("skill_force_backup_cleanup_failed")
            .with_param("path", backup.to_string_lossy())
            .with_param("message", error.to_string()));
    }
    Ok(replacement)
}

pub fn preserve_managed_target(
    source: &Path,
    target: &Path,
    skill_id: &str,
) -> Result<(), SkillManagerError> {
    validate_skill_id(skill_id)?;
    ensure_source(source, skill_id)?;
    let current = inspect_target(source, target, skill_id)?;
    if !matches!(
        current.status,
        SkillToolStatus::Enabled | SkillToolStatus::Stale
    ) {
        return Err(
            SkillManagerError::new("skill_target_not_managed").with_param("skillId", skill_id)
        );
    }

    match current.actual_mode {
        Some(ActualSyncMode::Copy) => fs::remove_file(target.join(MANAGEMENT_MARKER))
            .map_err(|error| io_error("detach_copy_marker", error)),
        Some(ActualSyncMode::Symlink | ActualSyncMode::Junction) => {
            materialize_link(source, target, skill_id)
        }
        None => {
            Err(SkillManagerError::new("skill_target_not_managed").with_param("skillId", skill_id))
        }
    }
}

fn materialize_link(source: &Path, target: &Path, skill_id: &str) -> Result<(), SkillManagerError> {
    let parent = target
        .parent()
        .ok_or_else(|| SkillManagerError::new("skill_target_parent_missing"))?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary = parent.join(format!(".promptclip-{skill_id}-{unique}.preserve"));
    if let Err(error) = copy_directory(source, &temporary) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }
    if compute_skill_hash(&temporary)? != compute_skill_hash(source)? {
        let _ = fs::remove_dir_all(&temporary);
        return Err(SkillManagerError::new("skill_copy_verification_failed"));
    }

    remove_directory_link(target).map_err(|error| io_error("remove_link", error))?;
    if let Err(error) = fs::rename(&temporary, target) {
        let rollback = create_directory_link(source, target);
        let _ = fs::remove_dir_all(&temporary);
        return match rollback {
            Ok(()) => Err(io_error("activate_preserved_copy", error)),
            Err(rollback_error) => Err(SkillManagerError::new("skill_preserve_rollback_failed")
                .with_param("activationError", error.to_string())
                .with_param("rollbackError", rollback_error.to_string())),
        };
    }
    Ok(())
}

fn install_and_verify_target(
    source: &Path,
    target: &Path,
    skill_id: &str,
    mode: SyncMode,
) -> Result<TargetState, SkillManagerError> {
    match mode {
        SyncMode::Symlink => create_directory_link(source, target)?,
        SyncMode::Copy => create_managed_copy(source, target, skill_id)?,
    }
    let verified = inspect_target(source, target, skill_id)?;
    if verified.status != SkillToolStatus::Enabled || !mode_matches(verified.actual_mode, mode) {
        return Err(SkillManagerError::new("skill_target_verification_failed")
            .with_param("skillId", skill_id));
    }
    Ok(verified)
}

fn rollback_force_replacement(target: &Path, backup: &Path) -> Result<(), SkillManagerError> {
    if fs::symlink_metadata(target).is_ok() {
        remove_entry_without_following(target).map_err(|error| {
            SkillManagerError::new("skill_force_rollback_failed")
                .with_param("message", error.to_string())
        })?;
    }
    fs::rename(backup, target).map_err(|error| {
        SkillManagerError::new("skill_force_rollback_failed")
            .with_param("message", error.to_string())
    })
}

fn remove_entry_without_following(path: &Path) -> std::io::Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    if is_link_like(&metadata) {
        remove_directory_link(path)
    } else if metadata.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
}

fn inspect_link(source: &Path, target: &Path) -> Result<TargetState, SkillManagerError> {
    let link_target = fs::read_link(target).map_err(|error| io_error("read_link", error))?;
    let resolved = if link_target.is_absolute() {
        link_target
    } else {
        target
            .parent()
            .unwrap_or_else(|| Path::new(""))
            .join(link_target)
    };
    let actual_mode = link_actual_mode(target);
    let resolved_canonical = match fs::canonicalize(&resolved) {
        Ok(path) => path,
        Err(_) => {
            return Ok(target_state(
                SkillToolStatus::Broken,
                Some(actual_mode),
                Some("skill_target_link_broken"),
            ));
        }
    };
    let source_canonical =
        fs::canonicalize(source).map_err(|error| io_error("canonicalize_source", error))?;
    if resolved_canonical == source_canonical {
        Ok(target_state(
            SkillToolStatus::Enabled,
            Some(actual_mode),
            None,
        ))
    } else {
        Ok(target_state(
            SkillToolStatus::Conflict,
            Some(actual_mode),
            Some("skill_target_wrong_link"),
        ))
    }
}

fn inspect_copy(
    source: &Path,
    target: &Path,
    skill_id: &str,
) -> Result<TargetState, SkillManagerError> {
    let marker_path = target.join(MANAGEMENT_MARKER);
    let marker_contents = match fs::read_to_string(marker_path) {
        Ok(contents) => contents,
        Err(_) => {
            return Ok(target_state(
                SkillToolStatus::Conflict,
                None,
                Some("skill_target_unmanaged_directory"),
            ));
        }
    };
    let marker: CopyMarker = match serde_json::from_str(&marker_contents) {
        Ok(marker) => marker,
        Err(_) => {
            return Ok(target_state(
                SkillToolStatus::Conflict,
                None,
                Some("skill_target_invalid_marker"),
            ));
        }
    };
    if marker.owner != "promptclip" || marker.skill_id != skill_id {
        return Ok(target_state(
            SkillToolStatus::Conflict,
            None,
            Some("skill_target_marker_mismatch"),
        ));
    }
    let source_hash = compute_skill_hash(source)?;
    let target_hash = compute_skill_hash(target)?;
    let status = if source_hash == target_hash && marker.source_hash == source_hash {
        SkillToolStatus::Enabled
    } else {
        SkillToolStatus::Stale
    };
    Ok(target_state(status, Some(ActualSyncMode::Copy), None))
}

fn disable_target(
    source: &Path,
    target: &Path,
    skill_id: &str,
    current: TargetState,
) -> Result<TargetState, SkillManagerError> {
    if current.status == SkillToolStatus::Disabled {
        return Ok(current);
    }
    if matches!(
        current.status,
        SkillToolStatus::Conflict | SkillToolStatus::Broken
    ) {
        return Err(SkillManagerError::new("skill_target_conflict").with_param("skillId", skill_id));
    }
    remove_verified_target(source, target, skill_id, &current)?;
    inspect_target(source, target, skill_id)
}

fn remove_verified_target(
    _source: &Path,
    target: &Path,
    _skill_id: &str,
    current: &TargetState,
) -> Result<(), SkillManagerError> {
    match current.actual_mode {
        Some(ActualSyncMode::Symlink | ActualSyncMode::Junction) => {
            remove_directory_link(target).map_err(|error| io_error("remove_link", error))
        }
        Some(ActualSyncMode::Copy) => {
            fs::remove_dir_all(target).map_err(|error| io_error("remove_managed_copy", error))
        }
        None => Err(SkillManagerError::new("skill_target_conflict")),
    }
}

fn ensure_source(source: &Path, skill_id: &str) -> Result<(), SkillManagerError> {
    let metadata = fs::symlink_metadata(source).map_err(|error| io_error("read_source", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(SkillManagerError::new("skill_source_invalid"));
    }
    if source.file_name().and_then(|name| name.to_str()) != Some(skill_id) {
        return Err(SkillManagerError::new("skill_source_name_mismatch"));
    }
    compute_skill_hash(source)?;
    Ok(())
}

fn create_managed_copy(
    source: &Path,
    target: &Path,
    skill_id: &str,
) -> Result<(), SkillManagerError> {
    let parent = target
        .parent()
        .ok_or_else(|| SkillManagerError::new("skill_target_parent_missing"))?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary = parent.join(format!(".promptclip-{skill_id}-{unique}.tmp"));
    if let Err(error) = copy_directory(source, &temporary) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }
    let source_hash = compute_skill_hash(source)?;
    let marker = CopyMarker {
        schema_version: 1,
        owner: "promptclip".to_string(),
        skill_id: skill_id.to_string(),
        source_hash: source_hash.clone(),
        synced_at: format!(
            "{}Z",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        ),
    };
    let marker_json = serde_json::to_vec_pretty(&marker)
        .map_err(|_| SkillManagerError::new("skill_marker_serialize_failed"))?;
    fs::write(temporary.join(MANAGEMENT_MARKER), marker_json)
        .map_err(|error| io_error("write_copy_marker", error))?;
    if compute_skill_hash(&temporary)? != source_hash {
        let _ = fs::remove_dir_all(&temporary);
        return Err(SkillManagerError::new("skill_copy_verification_failed"));
    }
    if !target.exists() {
        return fs::rename(&temporary, target).map_err(|error| {
            let _ = fs::remove_dir_all(&temporary);
            io_error("activate_managed_copy", error)
        });
    }

    let backup = parent.join(format!(".promptclip-{skill_id}-{unique}.backup"));
    fs::rename(target, &backup).map_err(|error| {
        let _ = fs::remove_dir_all(&temporary);
        io_error("backup_managed_copy", error)
    })?;
    if let Err(error) = fs::rename(&temporary, target) {
        let rollback = fs::rename(&backup, target);
        let _ = fs::remove_dir_all(&temporary);
        return match rollback {
            Ok(()) => Err(io_error("activate_managed_copy", error)),
            Err(rollback_error) => Err(SkillManagerError::new("skill_copy_rollback_failed")
                .with_param("activationError", error.to_string())
                .with_param("rollbackError", rollback_error.to_string())),
        };
    }
    fs::remove_dir_all(backup).map_err(|error| io_error("remove_copy_backup", error))
}

pub(crate) fn copy_directory(source: &Path, target: &Path) -> Result<(), SkillManagerError> {
    fs::create_dir(target).map_err(|error| io_error("create_copy_directory", error))?;
    for entry in fs::read_dir(source)
        .map_err(|error| io_error("read_copy_source", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| io_error("read_copy_entry", error))?
    {
        if entry.file_name() == MANAGEMENT_MARKER {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| io_error("read_copy_file_type", error))?;
        let destination = target.join(entry.file_name());
        if file_type.is_symlink() {
            return Err(SkillManagerError::new("skill_content_symlink")
                .with_param("path", entry.file_name().to_string_lossy()));
        }
        if file_type.is_dir() {
            copy_directory(&entry.path(), &destination)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), destination)
                .map_err(|error| io_error("copy_skill_file", error))?;
        } else {
            return Err(SkillManagerError::new("skill_content_special_file"));
        }
    }
    Ok(())
}

#[cfg(unix)]
fn create_directory_link(source: &Path, target: &Path) -> Result<(), SkillManagerError> {
    std::os::unix::fs::symlink(source, target).map_err(|error| io_error("create_symlink", error))
}

#[cfg(windows)]
fn create_directory_link(source: &Path, target: &Path) -> Result<(), SkillManagerError> {
    if std::os::windows::fs::symlink_dir(source, target).is_ok() {
        return Ok(());
    }
    let output = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J"])
        .arg(target)
        .arg(source)
        .output()
        .map_err(|error| io_error("create_junction", error))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(SkillManagerError::new("skill_symlink_permission_denied"))
    }
}

#[cfg(unix)]
fn remove_directory_link(target: &Path) -> std::io::Result<()> {
    fs::remove_file(target)
}

#[cfg(windows)]
fn remove_directory_link(target: &Path) -> std::io::Result<()> {
    fs::remove_dir(target).or_else(|_| fs::remove_file(target))
}

fn is_link_like(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x0400;
        return metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0;
    }
    #[cfg(not(windows))]
    false
}

fn link_actual_mode(_target: &Path) -> ActualSyncMode {
    #[cfg(windows)]
    {
        let metadata = fs::symlink_metadata(_target).ok();
        if metadata.is_some_and(|metadata| metadata.file_type().is_symlink()) {
            return ActualSyncMode::Symlink;
        }
        ActualSyncMode::Junction
    }
    #[cfg(not(windows))]
    ActualSyncMode::Symlink
}

fn mode_matches(actual: Option<ActualSyncMode>, desired: SyncMode) -> bool {
    matches!(
        (actual, desired),
        (
            Some(ActualSyncMode::Symlink | ActualSyncMode::Junction),
            SyncMode::Symlink
        ) | (Some(ActualSyncMode::Copy), SyncMode::Copy)
    )
}

fn target_state(
    status: SkillToolStatus,
    actual_mode: Option<ActualSyncMode>,
    message: Option<&str>,
) -> TargetState {
    TargetState {
        status,
        actual_mode,
        message: message.map(str::to_string),
    }
}

fn io_error(operation: &str, error: std::io::Error) -> SkillManagerError {
    SkillManagerError::new("skill_io_error")
        .with_param("operation", operation)
        .with_param("message", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        force_set_skill_enabled, inspect_target, rollback_force_replacement, set_skill_enabled,
    };
    use crate::skills::models::{ActualSyncMode, SkillToolStatus, SyncMode};
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    fn write_skill(path: &Path, skill_id: &str) {
        fs::create_dir_all(path).expect("skill directory should be created");
        fs::write(
            path.join("SKILL.md"),
            format!("---\nname: {skill_id}\ndescription: Test skill\n---\n"),
        )
        .expect("SKILL.md should be written");
    }

    #[test]
    fn should_report_missing_target_as_disabled() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        write_skill(&source, "test-skill");

        let state = inspect_target(
            &source,
            &temp.path().join("target/test-skill"),
            "test-skill",
        )
        .expect("target should inspect");

        assert_eq!(state.status, SkillToolStatus::Disabled);
        assert_eq!(state.actual_mode, None);
    }

    #[cfg(unix)]
    #[test]
    fn should_enable_and_disable_verified_symlink() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let target_root = temp.path().join("agent/skills");
        write_skill(&source, "test-skill");

        let enabled =
            set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Symlink, true)
                .expect("symlink should enable");
        let disabled = set_skill_enabled(
            &source,
            &target_root,
            "test-skill",
            SyncMode::Symlink,
            false,
        )
        .expect("symlink should disable");

        assert_eq!(enabled.status, SkillToolStatus::Enabled);
        assert_eq!(enabled.actual_mode, Some(ActualSyncMode::Symlink));
        assert_eq!(disabled.status, SkillToolStatus::Disabled);
        assert!(source.exists());
    }

    #[cfg(unix)]
    #[test]
    fn should_refuse_to_remove_symlink_to_another_source() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let other = temp.path().join("other/test-skill");
        let target_root = temp.path().join("agent/skills");
        write_skill(&source, "test-skill");
        write_skill(&other, "test-skill");
        fs::create_dir_all(&target_root).expect("target root should be created");
        symlink(&other, target_root.join("test-skill")).expect("wrong symlink should be created");

        let result = set_skill_enabled(
            &source,
            &target_root,
            "test-skill",
            SyncMode::Symlink,
            false,
        );

        assert_eq!(
            result.expect_err("wrong link must be kept").code,
            "skill_target_conflict"
        );
        assert!(target_root.join("test-skill").symlink_metadata().is_ok());
    }

    #[test]
    fn should_copy_hidden_files_and_detect_stale_content() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let target_root = temp.path().join("agent/skills");
        write_skill(&source, "test-skill");
        fs::write(source.join(".hidden"), "hidden").expect("hidden file should be written");

        let enabled = set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, true)
            .expect("copy should enable");
        fs::write(source.join("changed.txt"), "changed").expect("source should change");
        let stale = inspect_target(&source, &target_root.join("test-skill"), "test-skill")
            .expect("copy should inspect");

        assert_eq!(enabled.actual_mode, Some(ActualSyncMode::Copy));
        assert!(target_root.join("test-skill/.hidden").exists());
        assert!(target_root
            .join("test-skill/.promptclip-sync.json")
            .exists());
        assert_eq!(stale.status, SkillToolStatus::Stale);
    }

    #[test]
    fn should_atomically_refresh_stale_managed_copy() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let target_root = temp.path().join("agent/skills");
        write_skill(&source, "test-skill");
        set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, true)
            .expect("copy should enable");
        fs::write(source.join("new.txt"), "new content").expect("source should change");

        let refreshed =
            set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, true)
                .expect("copy should refresh");

        assert_eq!(refreshed.status, SkillToolStatus::Enabled);
        assert_eq!(
            fs::read_to_string(target_root.join("test-skill/new.txt"))
                .expect("new file should be copied"),
            "new content"
        );
        assert!(fs::read_dir(&target_root)
            .expect("target root should read")
            .all(|entry| !entry
                .expect("entry should read")
                .file_name()
                .to_string_lossy()
                .contains(".backup")));
    }

    #[test]
    fn should_never_remove_unmanaged_real_directory() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let target_root = temp.path().join("agent/skills");
        let target = target_root.join("test-skill");
        write_skill(&source, "test-skill");
        write_skill(&target, "test-skill");

        let result = set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy, false);

        assert_eq!(
            result.expect_err("unknown directory must be kept").code,
            "skill_target_conflict"
        );
        assert!(target.join("SKILL.md").exists());
    }

    #[test]
    fn should_force_replace_an_unmanaged_directory_with_a_managed_copy() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let target_root = temp.path().join("agent/skills");
        let target = target_root.join("test-skill");
        write_skill(&source, "test-skill");
        write_skill(&target, "test-skill");
        fs::write(target.join("external-only.txt"), "external")
            .expect("external file should be written");

        let state = force_set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Copy)
            .expect("conflict should be force replaced");

        assert_eq!(state.status, SkillToolStatus::Enabled);
        assert_eq!(state.actual_mode, Some(ActualSyncMode::Copy));
        assert!(source.join("SKILL.md").is_file());
        assert!(!target.join("external-only.txt").exists());
        assert!(target.join(".promptclip-sync.json").is_file());
        assert!(fs::read_dir(&target_root)
            .expect("target root should read")
            .all(|entry| !entry
                .expect("entry should read")
                .file_name()
                .to_string_lossy()
                .contains("force-backup")));
        assert!(fs::read_dir(temp.path().join("temp/conflict-backups"))
            .expect("backup root should read")
            .next()
            .is_none());
    }

    #[cfg(unix)]
    #[test]
    fn should_force_replace_a_link_to_another_source() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("hub/test-skill");
        let other = temp.path().join("other/test-skill");
        let target_root = temp.path().join("agent/skills");
        write_skill(&source, "test-skill");
        write_skill(&other, "test-skill");
        fs::create_dir_all(&target_root).expect("target root should be created");
        symlink(&other, target_root.join("test-skill")).expect("wrong link should be created");

        let state = force_set_skill_enabled(&source, &target_root, "test-skill", SyncMode::Symlink)
            .expect("wrong link should be replaced");

        assert_eq!(state.status, SkillToolStatus::Enabled);
        assert_eq!(
            fs::canonicalize(target_root.join("test-skill")).expect("link should resolve"),
            fs::canonicalize(source).expect("source should resolve")
        );
        assert!(other.join("SKILL.md").is_file());
    }

    #[test]
    fn should_restore_the_original_target_after_replacement_failure() {
        let temp = tempdir().expect("temp directory should be created");
        let target = temp.path().join("target/test-skill");
        let backup = temp.path().join("backup/test-skill");
        fs::create_dir_all(&target).expect("partial replacement should be created");
        fs::write(target.join("partial.txt"), "partial")
            .expect("partial content should be written");
        fs::create_dir_all(&backup).expect("backup should be created");
        fs::write(backup.join("original.txt"), "original")
            .expect("original content should be written");

        rollback_force_replacement(&target, &backup).expect("rollback should succeed");

        assert!(target.join("original.txt").is_file());
        assert!(!target.join("partial.txt").exists());
        assert!(!backup.exists());
    }
}
