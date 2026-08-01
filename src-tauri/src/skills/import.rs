use super::models::SkillManagerError;
use super::paths::validate_skill_id;
use super::scanner::{compute_skill_hash, resolve_external_skill_directory, scan_skill_directory};
use super::sync::copy_directory;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportDecision {
    KeepHub,
    UseExternal,
    Skip,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportOutcome {
    Imported,
    Replaced,
    KeptHub,
    Skipped,
}

pub fn import_external_skill(
    source: &Path,
    hub: &Path,
    skill_id: &str,
    expected_hash: &str,
    decision: ImportDecision,
) -> Result<ImportOutcome, SkillManagerError> {
    validate_skill_id(skill_id)?;
    if decision == ImportDecision::Skip {
        return Ok(ImportOutcome::Skipped);
    }
    let destination = hub.join(skill_id);
    if decision == ImportDecision::KeepHub {
        return if destination.is_dir() {
            Ok(ImportOutcome::KeptHub)
        } else {
            Err(SkillManagerError::new("skill_hub_version_missing"))
        };
    }
    let resolved_source = validate_external_source(source, skill_id, expected_hash)?;
    fs::create_dir_all(hub).map_err(|error| io_error("create_hub", error))?;

    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary = hub.join(format!(".promptclip-import-{skill_id}-{unique}.tmp"));
    if let Err(error) = copy_directory(&resolved_source, &temporary) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }
    if let Err(error) = normalize_entry_filename(&temporary) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }
    if let Err(error) = scan_skill_directory(&temporary, skill_id) {
        let _ = fs::remove_dir_all(&temporary);
        return Err(error);
    }

    if !destination.exists() {
        fs::rename(&temporary, &destination).map_err(|error| {
            let _ = fs::remove_dir_all(&temporary);
            io_error("activate_import", error)
        })?;
        return Ok(ImportOutcome::Imported);
    }
    replace_directory(&temporary, &destination, skill_id, unique)?;
    Ok(ImportOutcome::Replaced)
}

fn validate_external_source(
    source: &Path,
    skill_id: &str,
    expected_hash: &str,
) -> Result<std::path::PathBuf, SkillManagerError> {
    if source.file_name().and_then(|name| name.to_str()) != Some(skill_id) {
        return Err(SkillManagerError::new("skill_source_name_mismatch"));
    }
    let resolved_source = resolve_external_skill_directory(source)?;
    if compute_skill_hash(&resolved_source)? != expected_hash {
        return Err(SkillManagerError::new("skill_source_changed").with_param("skillId", skill_id));
    }
    Ok(resolved_source)
}

fn normalize_entry_filename(skill_path: &Path) -> Result<(), SkillManagerError> {
    let mut has_uppercase = false;
    let mut lowercase_path = None;
    for entry in
        fs::read_dir(skill_path).map_err(|error| io_error("read_import_directory", error))?
    {
        let entry = entry.map_err(|error| io_error("read_import_entry", error))?;
        if entry.file_name() == "SKILL.md" {
            has_uppercase = true;
        } else if entry.file_name() == "skill.md" {
            lowercase_path = Some(entry.path());
        }
    }
    match (has_uppercase, lowercase_path) {
        (true, Some(_)) => Err(SkillManagerError::new("skill_entry_duplicate_case")),
        (true, None) => Ok(()),
        (false, Some(lowercase)) => {
            let intermediate = skill_path.join(".promptclip-entry-rename.tmp");
            fs::rename(&lowercase, &intermediate)
                .map_err(|error| io_error("normalize_skill_entry", error))?;
            fs::rename(intermediate, skill_path.join("SKILL.md"))
                .map_err(|error| io_error("normalize_skill_entry", error))
        }
        (false, None) => Err(SkillManagerError::new("skill_markdown_missing")),
    }
}

fn replace_directory(
    temporary: &Path,
    destination: &Path,
    skill_id: &str,
    unique: u128,
) -> Result<(), SkillManagerError> {
    let hub = destination
        .parent()
        .ok_or_else(|| SkillManagerError::new("skill_hub_missing"))?;
    let backup = hub.join(format!(".promptclip-import-{skill_id}-{unique}.backup"));
    fs::rename(destination, &backup).map_err(|error| {
        let _ = fs::remove_dir_all(temporary);
        io_error("backup_hub_skill", error)
    })?;
    if let Err(error) = fs::rename(temporary, destination) {
        let rollback = fs::rename(&backup, destination);
        let _ = fs::remove_dir_all(temporary);
        return match rollback {
            Ok(()) => Err(io_error("activate_import", error)),
            Err(rollback_error) => Err(SkillManagerError::new("skill_import_rollback_failed")
                .with_param("activationError", error.to_string())
                .with_param("rollbackError", rollback_error.to_string())),
        };
    }
    fs::remove_dir_all(backup).map_err(|error| io_error("remove_import_backup", error))
}

fn io_error(operation: &str, error: std::io::Error) -> SkillManagerError {
    SkillManagerError::new("skill_io_error")
        .with_param("operation", operation)
        .with_param("message", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{import_external_skill, ImportDecision, ImportOutcome};
    use crate::skills::scanner::compute_skill_hash;
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    fn write_skill(path: &Path, skill_id: &str, description: &str, lowercase: bool) {
        fs::create_dir_all(path).expect("skill directory should be created");
        let entry = if lowercase { "skill.md" } else { "SKILL.md" };
        fs::write(
            path.join(entry),
            format!("---\nname: {skill_id}\ndescription: {description}\n---\n"),
        )
        .expect("skill markdown should be written");
    }

    #[test]
    fn should_copy_new_external_skill_and_normalize_lowercase_entry() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("external/new-skill");
        let hub = temp.path().join("hub");
        write_skill(&source, "new-skill", "External version", true);
        fs::create_dir(&hub).expect("hub should be created");
        let expected_hash = compute_skill_hash(&source).expect("hash should compute");

        let outcome = import_external_skill(
            &source,
            &hub,
            "new-skill",
            &expected_hash,
            ImportDecision::UseExternal,
        )
        .expect("external skill should import");

        assert_eq!(outcome, ImportOutcome::Imported);
        assert!(hub.join("new-skill/SKILL.md").exists());
        let entry_names = fs::read_dir(hub.join("new-skill"))
            .expect("imported skill should read")
            .map(|entry| entry.expect("entry should read").file_name())
            .collect::<Vec<_>>();
        assert!(entry_names.iter().any(|name| name == "SKILL.md"));
        assert!(!entry_names.iter().any(|name| name == "skill.md"));
        assert!(source.join("skill.md").exists());
    }

    #[cfg(unix)]
    #[test]
    fn should_import_external_skill_through_top_level_symlink() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let source_directory = temp.path().join("sources/linked-skill");
        let source_link = temp.path().join("external/linked-skill");
        let hub = temp.path().join("hub");
        write_skill(&source_directory, "linked-skill", "Linked version", false);
        fs::create_dir_all(source_link.parent().expect("link parent should exist"))
            .expect("link parent should be created");
        symlink(&source_directory, &source_link).expect("skill link should be created");
        let expected_hash = compute_skill_hash(&source_link).expect("hash should compute");

        let outcome = import_external_skill(
            &source_link,
            &hub,
            "linked-skill",
            &expected_hash,
            ImportDecision::UseExternal,
        )
        .expect("linked skill should import");

        assert_eq!(outcome, ImportOutcome::Imported);
        assert!(hub.join("linked-skill/SKILL.md").is_file());
        assert!(!hub.join("linked-skill").is_symlink());
    }

    #[test]
    fn should_keep_existing_hub_version_when_selected() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("external/existing");
        let hub = temp.path().join("hub");
        write_skill(&source, "existing", "External version", false);
        write_skill(&hub.join("existing"), "existing", "Hub version", false);
        let expected_hash = compute_skill_hash(&source).expect("hash should compute");

        let outcome = import_external_skill(
            &source,
            &hub,
            "existing",
            &expected_hash,
            ImportDecision::KeepHub,
        )
        .expect("Hub version should be kept");

        assert_eq!(outcome, ImportOutcome::KeptHub);
        assert!(fs::read_to_string(hub.join("existing/SKILL.md"))
            .expect("Hub markdown should read")
            .contains("Hub version"));
    }

    #[test]
    fn should_replace_existing_hub_version_without_modifying_external_source() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("external/existing");
        let hub = temp.path().join("hub");
        write_skill(&source, "existing", "External version", false);
        write_skill(&hub.join("existing"), "existing", "Hub version", false);
        let expected_hash = compute_skill_hash(&source).expect("hash should compute");

        let outcome = import_external_skill(
            &source,
            &hub,
            "existing",
            &expected_hash,
            ImportDecision::UseExternal,
        )
        .expect("external version should replace Hub");

        assert_eq!(outcome, ImportOutcome::Replaced);
        assert!(fs::read_to_string(hub.join("existing/SKILL.md"))
            .expect("Hub markdown should read")
            .contains("External version"));
        assert!(source.join("SKILL.md").exists());
    }

    #[test]
    fn should_reject_changed_external_version_before_writing_hub() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("external/changed");
        let hub = temp.path().join("hub");
        write_skill(&source, "changed", "Changed version", false);
        fs::create_dir(&hub).expect("hub should be created");

        let result = import_external_skill(
            &source,
            &hub,
            "changed",
            "outdated-hash",
            ImportDecision::UseExternal,
        );

        assert_eq!(
            result.expect_err("changed source must fail").code,
            "skill_source_changed"
        );
        assert!(!hub.join("changed").exists());
    }
}
