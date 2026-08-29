use super::models::{
    AgentTool, ExternalInvalidSkillEntry, ExternalScanResult, ExternalSkillGroup,
    ExternalSkillSource, ExternalSkillVersion, HubScanResult, InvalidSkillEntry, SkillManagerError,
    SkillSummary,
};
use super::paths::validate_skill_id;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const SKILL_MARKDOWN: &str = "SKILL.md";
const MANAGEMENT_MARKER: &str = ".promptclip-sync.json";

#[derive(Deserialize)]
pub(crate) struct SkillFrontmatter {
    pub name: String,
    pub description: String,
}

pub fn scan_hub(hub_path: &Path) -> Result<HubScanResult, SkillManagerError> {
    let mut entries = read_sorted_entries(hub_path)?;
    let mut skills = Vec::new();
    let mut invalid_entries = Vec::new();

    for entry in entries.drain(..) {
        let directory_name = entry.file_name().to_string_lossy().to_string();
        if directory_name.starts_with('.') {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| io_error("read_file_type", error))?;
        if file_type.is_symlink() {
            invalid_entries.push(invalid_entry(directory_name, "skill_entry_symlink"));
            continue;
        }
        if !file_type.is_dir() {
            continue;
        }

        match scan_skill_directory(&entry.path(), &directory_name) {
            Ok(skill) => skills.push(skill),
            Err(error) => invalid_entries.push(InvalidSkillEntry {
                directory_name,
                error,
            }),
        }
    }

    Ok(HubScanResult {
        skills,
        invalid_entries,
    })
}

pub fn scan_external_skills(tools: &[AgentTool]) -> Result<ExternalScanResult, SkillManagerError> {
    let mut paths = std::collections::BTreeMap::new();
    for tool in tools.iter().filter(|tool| tool.installed) {
        paths
            .entry(tool.skills_path.clone())
            .or_insert_with(Vec::new)
            .push(tool);
    }

    let mut groups: std::collections::BTreeMap<String, ExternalSkillGroup> =
        std::collections::BTreeMap::new();
    let mut invalid_entries = Vec::new();
    for (skills_path, mut path_tools) in paths {
        if !skills_path.exists() {
            continue;
        }
        path_tools.sort_by(|left, right| left.id.cmp(&right.id));
        scan_external_path(&skills_path, &path_tools, &mut groups, &mut invalid_entries)?;
    }

    Ok(ExternalScanResult {
        groups: groups.into_values().collect(),
        invalid_entries,
    })
}

fn scan_external_path(
    skills_path: &Path,
    tools: &[&AgentTool],
    groups: &mut std::collections::BTreeMap<String, ExternalSkillGroup>,
    invalid_entries: &mut Vec<ExternalInvalidSkillEntry>,
) -> Result<(), SkillManagerError> {
    for entry in read_sorted_entries(skills_path)? {
        let directory_name = entry.file_name().to_string_lossy().to_string();
        if directory_name.starts_with('.') {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| io_error("read_external_file_type", error))?;
        if !file_type.is_symlink() && !file_type.is_dir() {
            continue;
        }
        match scan_external_directory(&entry.path(), &directory_name, tools) {
            Ok((name, version)) => merge_external_version(groups, name, version),
            Err(error) => invalid_entries.push(ExternalInvalidSkillEntry {
                directory_name,
                error,
                source: external_skill_source(&entry.path(), tools),
            }),
        }
    }
    Ok(())
}

fn scan_external_directory(
    skill_path: &Path,
    directory_name: &str,
    tools: &[&AgentTool],
) -> Result<(String, ExternalSkillVersion), SkillManagerError> {
    validate_skill_id(directory_name)?;
    let resolved_skill_path = resolve_external_skill_directory(skill_path)?;
    let entry_names = read_sorted_entries(&resolved_skill_path)?;
    let uppercase = entry_names
        .iter()
        .find(|entry| entry.file_name() == SKILL_MARKDOWN)
        .map(fs::DirEntry::path);
    let lowercase = entry_names
        .iter()
        .find(|entry| entry.file_name() == "skill.md")
        .map(fs::DirEntry::path);
    let (entry_path, uses_lowercase_entry) = if let Some(uppercase) = uppercase {
        (uppercase, false)
    } else if let Some(lowercase) = lowercase {
        (lowercase, true)
    } else {
        return Err(SkillManagerError::new("skill_markdown_missing"));
    };
    let metadata = fs::symlink_metadata(&entry_path)
        .map_err(|error| io_error("read_external_skill_metadata", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(SkillManagerError::new("skill_markdown_invalid_type"));
    }
    let contents = fs::read_to_string(&entry_path)
        .map_err(|error| io_error("read_external_skill_markdown", error))?;
    let frontmatter = parse_frontmatter(&contents)?;
    if !frontmatter.name.eq_ignore_ascii_case(directory_name) {
        return Err(SkillManagerError::new("skill_name_mismatch")
            .with_param("directoryName", directory_name)
            .with_param("metadataName", frontmatter.name));
    }
    let modified_at_ms = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |duration| duration.as_millis() as u64);
    let source = external_skill_source(skill_path, tools);
    Ok((
        frontmatter.name,
        ExternalSkillVersion {
            description: frontmatter.description,
            content_hash: compute_skill_hash(&resolved_skill_path)?,
            modified_at_ms,
            uses_lowercase_entry,
            sources: vec![source],
        },
    ))
}

fn external_skill_source(skill_path: &Path, tools: &[&AgentTool]) -> ExternalSkillSource {
    ExternalSkillSource {
        target_group_id: tools[0].target_group_id.clone(),
        tool_ids: tools.iter().map(|tool| tool.id.clone()).collect(),
        path: skill_path.to_path_buf(),
    }
}

pub(crate) fn resolve_external_skill_directory(
    skill_path: &Path,
) -> Result<PathBuf, SkillManagerError> {
    let metadata = fs::symlink_metadata(skill_path)
        .map_err(|error| io_error("read_external_skill_metadata", error))?;
    if metadata.is_dir() {
        return Ok(skill_path.to_path_buf());
    }
    if !metadata.file_type().is_symlink() {
        return Err(SkillManagerError::new("skill_source_invalid"));
    }

    let resolved = fs::canonicalize(skill_path).map_err(|error| {
        SkillManagerError::new("skill_external_link_invalid")
            .with_param("path", skill_path.to_string_lossy())
            .with_param("message", error.to_string())
    })?;
    if !resolved.is_dir() {
        return Err(SkillManagerError::new("skill_external_link_invalid")
            .with_param("path", skill_path.to_string_lossy()));
    }
    Ok(resolved)
}

fn merge_external_version(
    groups: &mut std::collections::BTreeMap<String, ExternalSkillGroup>,
    name: String,
    version: ExternalSkillVersion,
) {
    let duplicate_key = name.trim().to_lowercase();
    let group = groups
        .entry(duplicate_key.clone())
        .or_insert_with(|| ExternalSkillGroup {
            duplicate_key,
            name,
            versions: Vec::new(),
        });
    if let Some(existing) = group
        .versions
        .iter_mut()
        .find(|existing| existing.content_hash == version.content_hash)
    {
        existing.sources.extend(version.sources);
        existing.modified_at_ms = existing.modified_at_ms.max(version.modified_at_ms);
        existing.uses_lowercase_entry |= version.uses_lowercase_entry;
    } else {
        group.versions.push(version);
    }
}

pub(crate) fn scan_skill_directory(
    skill_path: &Path,
    directory_name: &str,
) -> Result<SkillSummary, SkillManagerError> {
    validate_skill_id(directory_name)?;
    let markdown_path = skill_path.join(SKILL_MARKDOWN);
    let metadata = fs::symlink_metadata(&markdown_path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            SkillManagerError::new("skill_markdown_missing")
        } else {
            io_error("read_skill_markdown_metadata", error)
        }
    })?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(SkillManagerError::new("skill_markdown_invalid_type"));
    }

    let contents = fs::read_to_string(&markdown_path)
        .map_err(|error| io_error("read_skill_markdown", error))?;
    let frontmatter = parse_frontmatter(&contents)?;
    if frontmatter.name != directory_name {
        return Err(SkillManagerError::new("skill_name_mismatch")
            .with_param("directoryName", directory_name)
            .with_param("metadataName", frontmatter.name));
    }

    Ok(SkillSummary {
        id: directory_name.to_string(),
        name: directory_name.to_string(),
        description: frontmatter.description,
        relative_path: directory_name.to_string(),
        content_hash: compute_skill_hash(skill_path)?,
        favorited_at: None,
        category_ids: Vec::new(),
        tool_states: std::collections::BTreeMap::new(),
    })
}

pub(crate) fn parse_frontmatter(contents: &str) -> Result<SkillFrontmatter, SkillManagerError> {
    let without_bom = contents.strip_prefix('\u{feff}').unwrap_or(contents);
    let normalized = without_bom.replace("\r\n", "\n");
    let body = normalized
        .strip_prefix("---\n")
        .ok_or_else(|| SkillManagerError::new("skill_frontmatter_missing"))?;
    let end = body
        .find("\n---")
        .ok_or_else(|| SkillManagerError::new("skill_frontmatter_unclosed"))?;
    let yaml = &body[..end];
    let frontmatter: SkillFrontmatter = serde_yaml::from_str(yaml)
        .map_err(|_| SkillManagerError::new("skill_frontmatter_invalid"))?;
    validate_skill_id(&frontmatter.name)?;
    if frontmatter.description.trim().is_empty() {
        return Err(SkillManagerError::new("skill_description_empty"));
    }
    Ok(frontmatter)
}

pub fn compute_skill_hash(skill_path: &Path) -> Result<String, SkillManagerError> {
    let mut hasher = Sha256::new();
    hash_directory(skill_path, skill_path, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn hash_directory(
    root: &Path,
    directory: &Path,
    hasher: &mut Sha256,
) -> Result<(), SkillManagerError> {
    for entry in read_sorted_entries(directory)? {
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|_| SkillManagerError::new("skill_path_outside_root"))?;
        if should_ignore_hash_path(relative) {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| io_error("read_file_type", error))?;
        if file_type.is_symlink() {
            return Err(SkillManagerError::new("skill_content_symlink")
                .with_param("path", relative.to_string_lossy()));
        }
        let relative_bytes = relative.to_string_lossy();
        if file_type.is_dir() {
            hasher.update(b"directory\0");
            hasher.update(relative_bytes.as_bytes());
            hasher.update(b"\0");
            hash_directory(root, &path, hasher)?;
        } else if file_type.is_file() {
            hasher.update(b"file\0");
            hasher.update(relative_bytes.as_bytes());
            hasher.update(b"\0");
            hasher.update(fs::read(&path).map_err(|error| io_error("read_skill_file", error))?);
            hasher.update(b"\0");
        } else {
            return Err(SkillManagerError::new("skill_content_special_file")
                .with_param("path", relative.to_string_lossy()));
        }
    }
    Ok(())
}

fn should_ignore_hash_path(relative: &Path) -> bool {
    if relative == Path::new(MANAGEMENT_MARKER) {
        return true;
    }
    relative
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with(".promptclip-") && name.ends_with(".tmp"))
}

fn read_sorted_entries(path: &Path) -> Result<Vec<fs::DirEntry>, SkillManagerError> {
    let mut entries = fs::read_dir(path)
        .map_err(|error| io_error("read_directory", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| io_error("read_directory_entry", error))?;
    entries.sort_by_key(|entry| entry.file_name());
    Ok(entries)
}

fn invalid_entry(directory_name: String, code: &str) -> InvalidSkillEntry {
    InvalidSkillEntry {
        directory_name,
        error: SkillManagerError::new(code),
    }
}

fn io_error(operation: &str, error: std::io::Error) -> SkillManagerError {
    SkillManagerError::new("skill_io_error")
        .with_param("operation", operation)
        .with_param("message", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{compute_skill_hash, scan_external_skills, scan_hub};
    use crate::skills::models::{AgentTool, SyncMode, ToolSource, ToolSyncMode};
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    fn write_skill(root: &Path, directory: &str, name: &str, description: &str) {
        let skill = root.join(directory);
        fs::create_dir_all(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("SKILL.md"),
            format!("---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n"),
        )
        .expect("SKILL.md should be written");
    }

    fn agent_tool(id: &str, skills_path: &Path, target_group_id: &str) -> AgentTool {
        AgentTool {
            id: id.to_string(),
            name: id.to_string(),
            installed: true,
            detection_reasons: Vec::new(),
            config_path: skills_path.parent().expect("skills parent").to_path_buf(),
            skills_path: skills_path.to_path_buf(),
            target_group_id: target_group_id.to_string(),
            sync_mode: ToolSyncMode::Inherit,
            effective_sync_mode: SyncMode::Copy,
            copy_only: false,
            icon_id: id.to_string(),
            source: ToolSource::Builtin,
            enabled: true,
        }
    }

    #[test]
    fn should_scan_valid_direct_child_and_parse_metadata() {
        let temp = tempdir().expect("temp directory should be created");
        write_skill(
            temp.path(),
            "review-code",
            "review-code",
            "Review source code",
        );

        let result = scan_hub(temp.path()).expect("hub should scan");

        assert_eq!(result.skills.len(), 1);
        assert_eq!(result.skills[0].id, "review-code");
        assert_eq!(result.skills[0].description, "Review source code");
        assert_eq!(result.invalid_entries.len(), 0);
    }

    #[test]
    fn should_report_missing_skill_markdown_as_invalid() {
        let temp = tempdir().expect("temp directory should be created");
        fs::create_dir(temp.path().join("missing-entry"))
            .expect("skill directory should be created");

        let result = scan_hub(temp.path()).expect("hub should scan");

        assert!(result.skills.is_empty());
        assert_eq!(
            result.invalid_entries[0].error.code,
            "skill_markdown_missing"
        );
    }

    #[test]
    fn should_reject_metadata_name_that_differs_from_directory() {
        let temp = tempdir().expect("temp directory should be created");
        write_skill(temp.path(), "directory-name", "other-name", "Mismatch");

        let result = scan_hub(temp.path()).expect("hub should scan");

        assert!(result.skills.is_empty());
        assert_eq!(result.invalid_entries[0].error.code, "skill_name_mismatch");
    }

    #[test]
    fn should_compute_stable_hash_and_ignore_management_marker() {
        let temp = tempdir().expect("temp directory should be created");
        write_skill(temp.path(), "stable", "stable", "Stable hash");
        let skill = temp.path().join("stable");
        fs::write(skill.join("notes.txt"), "first").expect("notes should be written");

        let original = compute_skill_hash(&skill).expect("hash should compute");
        fs::write(skill.join(".promptclip-sync.json"), "managed")
            .expect("marker should be written");
        let with_marker = compute_skill_hash(&skill).expect("hash should compute");
        fs::write(skill.join("notes.txt"), "second").expect("notes should change");
        let changed = compute_skill_hash(&skill).expect("hash should compute");

        assert_eq!(original, with_marker);
        assert_ne!(original, changed);
    }

    #[test]
    fn should_ignore_hidden_hub_entries_and_temporary_hash_files() {
        let temp = tempdir().expect("temp directory should be created");
        write_skill(temp.path(), "stable", "stable", "Stable hash");
        fs::create_dir(temp.path().join(".imports")).expect("hidden directory should be created");
        let skill = temp.path().join("stable");
        let original = compute_skill_hash(&skill).expect("hash should compute");
        fs::write(skill.join(".promptclip-save.tmp"), "temporary")
            .expect("temporary file should be written");

        let result = scan_hub(temp.path()).expect("hub should scan");
        let with_temporary = compute_skill_hash(&skill).expect("hash should compute");

        assert_eq!(result.skills.len(), 1);
        assert!(result.invalid_entries.is_empty());
        assert_eq!(original, with_temporary);
    }

    #[test]
    fn should_parse_frontmatter_with_windows_line_endings() {
        let temp = tempdir().expect("temp directory should be created");
        let skill = temp.path().join("windows-lines");
        fs::create_dir(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("SKILL.md"),
            "---\r\nname: windows-lines\r\ndescription: Windows lines\r\n---\r\n",
        )
        .expect("SKILL.md should be written");

        let result = scan_hub(temp.path()).expect("hub should scan");

        assert_eq!(result.skills.len(), 1);
        assert!(result.invalid_entries.is_empty());
    }

    #[test]
    fn should_scan_shared_external_path_once_and_merge_tool_sources() {
        let temp = tempdir().expect("temp directory should be created");
        let shared = temp.path().join("shared-skills");
        fs::create_dir(&shared).expect("skills path should be created");
        write_skill(&shared, "shared-skill", "shared-skill", "Shared version");
        let tools = vec![
            agent_tool("codex", &shared, "shared"),
            agent_tool("agents-skills", &shared, "shared"),
        ];

        let result = scan_external_skills(&tools).expect("external skills should scan");

        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.groups[0].versions.len(), 1);
        assert_eq!(
            result.groups[0].versions[0].sources[0].tool_ids,
            vec!["agents-skills", "codex"]
        );
    }

    #[test]
    fn should_merge_same_version_and_keep_different_hash_as_separate_version() {
        let temp = tempdir().expect("temp directory should be created");
        let first = temp.path().join("first");
        let same = temp.path().join("same");
        let different = temp.path().join("different");
        for directory in [&first, &same, &different] {
            fs::create_dir(directory).expect("skills path should be created");
        }
        write_skill(&first, "review", "review", "First version");
        write_skill(&same, "review", "review", "First version");
        write_skill(&different, "review", "review", "Different version");
        let tools = vec![
            agent_tool("codex", &first, "first"),
            agent_tool("cursor", &same, "same"),
            agent_tool("claude-code", &different, "different"),
        ];

        let result = scan_external_skills(&tools).expect("external skills should scan");

        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.groups[0].versions.len(), 2);
        assert!(result.groups[0]
            .versions
            .iter()
            .any(|version| version.sources.len() == 2));
    }

    #[test]
    fn should_discover_lowercase_skill_markdown_in_external_directory() {
        let temp = tempdir().expect("temp directory should be created");
        let skills = temp.path().join("skills");
        let skill = skills.join("legacy-skill");
        fs::create_dir_all(&skill).expect("skill directory should be created");
        fs::write(
            skill.join("skill.md"),
            "---\nname: legacy-skill\ndescription: Legacy skill\n---\n",
        )
        .expect("skill.md should be written");

        let result = scan_external_skills(&[agent_tool("cursor", &skills, "cursor")])
            .expect("external skills should scan");

        assert_eq!(result.groups[0].name, "legacy-skill");
        assert!(result.groups[0].versions[0].uses_lowercase_entry);
    }

    #[cfg(unix)]
    #[test]
    fn should_report_symlinked_skill_as_invalid() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let external = tempdir().expect("external directory should be created");
        write_skill(external.path(), "linked", "linked", "Linked skill");
        symlink(external.path().join("linked"), temp.path().join("linked"))
            .expect("symlink should be created");

        let result = scan_hub(temp.path()).expect("hub should scan");

        assert!(result.skills.is_empty());
        assert_eq!(result.invalid_entries[0].error.code, "skill_entry_symlink");
    }

    #[cfg(unix)]
    #[test]
    fn should_scan_external_skill_through_top_level_symlink() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let external = tempdir().expect("external directory should be created");
        let skills = temp.path().join("skills");
        let source = external.path().join("linked-skill");
        fs::create_dir(&skills).expect("skills directory should be created");
        write_skill(
            external.path(),
            "linked-skill",
            "linked-skill",
            "Linked skill",
        );
        symlink(&source, skills.join("linked-skill")).expect("skill link should be created");

        let result = scan_external_skills(&[agent_tool("claude-code", &skills, "claude")])
            .expect("external skills should scan");

        assert_eq!(result.groups.len(), 1);
        assert_eq!(result.groups[0].name, "linked-skill");
        assert_eq!(
            result.groups[0].versions[0].sources[0].path,
            skills.join("linked-skill")
        );
        assert!(result.invalid_entries.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn should_report_broken_external_skill_symlink_as_invalid() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let skills = temp.path().join("skills");
        fs::create_dir(&skills).expect("skills directory should be created");
        symlink(
            temp.path().join("missing-skill"),
            skills.join("broken-skill"),
        )
        .expect("broken skill link should be created");

        let result = scan_external_skills(&[agent_tool("claude-code", &skills, "claude")])
            .expect("external skills should scan");

        assert!(result.groups.is_empty());
        assert_eq!(result.invalid_entries.len(), 1);
        assert_eq!(result.invalid_entries[0].directory_name, "broken-skill");
        assert_eq!(
            result.invalid_entries[0].source.path,
            skills.join("broken-skill")
        );
        assert_eq!(
            result.invalid_entries[0].source.tool_ids,
            vec!["claude-code"]
        );
        assert_eq!(
            result.invalid_entries[0].error.code,
            "skill_external_link_invalid"
        );
    }

    #[cfg(unix)]
    #[test]
    fn should_reject_symlink_inside_linked_external_skill() {
        use std::os::unix::fs::symlink;

        let temp = tempdir().expect("temp directory should be created");
        let external = tempdir().expect("external directory should be created");
        let skills = temp.path().join("skills");
        let source = external.path().join("linked-skill");
        fs::create_dir(&skills).expect("skills directory should be created");
        write_skill(
            external.path(),
            "linked-skill",
            "linked-skill",
            "Linked skill",
        );
        symlink(
            external.path().join("outside.txt"),
            source.join("linked.txt"),
        )
        .expect("content link should be created");
        symlink(&source, skills.join("linked-skill")).expect("skill link should be created");

        let result = scan_external_skills(&[agent_tool("claude-code", &skills, "claude")])
            .expect("external skills should scan");

        assert!(result.groups.is_empty());
        assert_eq!(result.invalid_entries.len(), 1);
        assert_eq!(
            result.invalid_entries[0].error.code,
            "skill_content_symlink"
        );
    }
}
