use super::import::{import_external_skill, ImportDecision, ImportOutcome};
use super::models::{ArchivePreview, SkillManagerError};
use super::paths::validate_skill_id;
use super::scanner::{compute_skill_hash, parse_frontmatter, scan_skill_directory};
use serde_json::json;
use std::collections::BTreeSet;
use std::fs;
use std::io::{Seek, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::write::FileOptions;

const MAX_ARCHIVE_SIZE: u64 = 50 * 1024 * 1024;
const MAX_EXTRACTED_SIZE: u64 = 200 * 1024 * 1024;
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;
const MAX_ENTRY_COUNT: usize = 5_000;
const EXPORT_MARKER: &str = ".promptclip-export.json";

#[derive(Clone)]
struct ArchiveEntryPlan {
    index: usize,
    relative_path: PathBuf,
    is_directory: bool,
}

struct ArchivePlan {
    wrapped_skill_id: Option<String>,
    entries: Vec<ArchiveEntryPlan>,
    entry_count: usize,
    expanded_size: u64,
}

pub fn preview_skill_archive(
    archive_path: &Path,
    temporary_root: &Path,
) -> Result<ArchivePreview, SkillManagerError> {
    validate_archive_extension(archive_path)?;
    let plan = inspect_archive(archive_path)?;
    fs::create_dir_all(temporary_root)
        .map_err(|error| io_error("create_archive_temp_root", error))?;
    let workspace = temporary_root.join(format!("preview-{}", unix_millis()));
    let payload = workspace.join("payload");
    fs::create_dir_all(&payload).map_err(|error| io_error("create_archive_workspace", error))?;
    let preview = (|| {
        extract_archive(archive_path, &payload, &plan)?;
        let frontmatter = read_extracted_frontmatter(&payload)?;
        if plan
            .wrapped_skill_id
            .as_deref()
            .is_some_and(|wrapped| wrapped != frontmatter.name)
        {
            return Err(SkillManagerError::new("skill_name_mismatch"));
        }
        Ok(ArchivePreview {
            skill_id: frontmatter.name.clone(),
            name: frontmatter.name,
            description: frontmatter.description,
            content_hash: compute_skill_hash(&payload)?,
            entry_count: plan.entry_count,
            expanded_size: plan.expanded_size,
        })
    })();
    let cleanup_result = fs::remove_dir_all(&workspace);
    match (preview, cleanup_result) {
        (Ok(preview), Ok(())) => Ok(preview),
        (Ok(_), Err(error)) => Err(io_error("cleanup_archive_workspace", error)),
        (Err(error), _) => Err(error),
    }
}

pub fn import_skill_archive(
    archive_path: &Path,
    hub: &Path,
    temporary_root: &Path,
    decision: ImportDecision,
) -> Result<ImportOutcome, SkillManagerError> {
    validate_archive_extension(archive_path)?;
    let plan = inspect_archive(archive_path)?;
    fs::create_dir_all(temporary_root)
        .map_err(|error| io_error("create_archive_temp_root", error))?;
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let workspace = temporary_root.join(format!("archive-{unique}"));
    let payload = workspace.join("payload");
    fs::create_dir_all(&payload).map_err(|error| io_error("create_archive_workspace", error))?;

    let outcome = (|| {
        extract_archive(archive_path, &payload, &plan)?;
        let skill_id = validate_extracted_skill(&payload, plan.wrapped_skill_id.as_deref())?;
        let source = workspace.join(&skill_id);
        fs::rename(&payload, &source).map_err(|error| io_error("prepare_archive_import", error))?;
        let expected_hash = compute_skill_hash(&source)?;
        import_external_skill(&source, hub, &skill_id, &expected_hash, decision)
    })();
    let cleanup_result = fs::remove_dir_all(&workspace);
    match (outcome, cleanup_result) {
        (Ok(outcome), Ok(())) => Ok(outcome),
        (Ok(_), Err(error)) => Err(io_error("cleanup_archive_workspace", error)),
        (Err(error), _) => Err(error),
    }
}

pub fn export_skill_archive(
    source: &Path,
    destination: &Path,
    skill_id: &str,
) -> Result<(), SkillManagerError> {
    validate_skill_id(skill_id)?;
    if source.file_name().and_then(|name| name.to_str()) != Some(skill_id) {
        return Err(SkillManagerError::new("skill_source_name_mismatch"));
    }
    scan_skill_directory(source, skill_id)?;
    let file =
        fs::File::create(destination).map_err(|error| io_error("create_skill_archive", error))?;
    let mut writer = zip::ZipWriter::new(file);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    write_export_directory(&mut writer, source, source, skill_id, options)?;
    let marker = serde_json::to_vec_pretty(&json!({
        "schemaVersion": 1,
        "skillId": skill_id,
        "exportedAt": format!("{}Z", unix_millis()),
        "contentHash": compute_skill_hash(source)?,
    }))
    .map_err(|_| SkillManagerError::new("skill_export_marker_failed"))?;
    writer
        .start_file(EXPORT_MARKER, options)
        .map_err(zip_error)?;
    writer
        .write_all(&marker)
        .map_err(|error| io_error("write_export_marker", error))?;
    writer.finish().map_err(zip_error)?;
    Ok(())
}

fn inspect_archive(archive_path: &Path) -> Result<ArchivePlan, SkillManagerError> {
    let metadata = fs::metadata(archive_path).map_err(|error| io_error("read_archive", error))?;
    if metadata.len() > MAX_ARCHIVE_SIZE {
        return Err(SkillManagerError::new("skill_archive_too_large"));
    }
    let file = fs::File::open(archive_path).map_err(|error| io_error("open_archive", error))?;
    let mut archive = zip::ZipArchive::new(file).map_err(zip_error)?;
    if archive.len() > MAX_ENTRY_COUNT {
        return Err(SkillManagerError::new("skill_archive_too_many_entries"));
    }

    let mut raw_entries = Vec::new();
    let mut seen = BTreeSet::new();
    let mut total_size = 0_u64;
    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(zip_error)?;
        let name = std::str::from_utf8(entry.name_raw())
            .map_err(|_| SkillManagerError::new("skill_archive_non_utf8_path"))?;
        let normalized = normalize_archive_path(name)?;
        if normalized == Path::new(EXPORT_MARKER) {
            continue;
        }
        let key = normalized.to_string_lossy().to_lowercase();
        if !seen.insert(key) {
            return Err(SkillManagerError::new("skill_archive_duplicate_path"));
        }
        validate_archive_entry_type(entry.unix_mode(), entry.is_dir())?;
        if entry.size() > MAX_FILE_SIZE {
            return Err(SkillManagerError::new("skill_archive_file_too_large"));
        }
        total_size = total_size
            .checked_add(entry.size())
            .ok_or_else(|| SkillManagerError::new("skill_archive_expanded_too_large"))?;
        if total_size > MAX_EXTRACTED_SIZE {
            return Err(SkillManagerError::new("skill_archive_expanded_too_large"));
        }
        raw_entries.push((index, normalized, entry.is_dir()));
    }
    if raw_entries.is_empty() {
        return Err(SkillManagerError::new("skill_archive_empty"));
    }

    let rootless = raw_entries.iter().any(|(_, path, _)| {
        matches!(
            path.components()
                .next()
                .and_then(|component| component.as_os_str().to_str()),
            Some("SKILL.md" | "skill.md")
        )
    });
    let wrapped_skill_id = if rootless {
        None
    } else {
        let roots = raw_entries
            .iter()
            .filter_map(|(_, path, _)| path.components().next())
            .map(|component| component.as_os_str().to_string_lossy().to_string())
            .collect::<BTreeSet<_>>();
        if roots.len() != 1 {
            return Err(SkillManagerError::new("skill_archive_multiple_roots"));
        }
        let root = roots.into_iter().next().expect("one root should exist");
        validate_skill_id(&root)?;
        Some(root)
    };

    let entries = raw_entries
        .into_iter()
        .filter_map(|(index, path, is_directory)| {
            let relative_path = if wrapped_skill_id.is_some() {
                path.components().skip(1).collect::<PathBuf>()
            } else {
                path
            };
            if relative_path.as_os_str().is_empty() {
                None
            } else {
                Some(ArchiveEntryPlan {
                    index,
                    relative_path,
                    is_directory,
                })
            }
        })
        .collect();
    Ok(ArchivePlan {
        wrapped_skill_id,
        entries,
        entry_count: seen.len(),
        expanded_size: total_size,
    })
}

fn extract_archive(
    archive_path: &Path,
    payload: &Path,
    plan: &ArchivePlan,
) -> Result<(), SkillManagerError> {
    let file = fs::File::open(archive_path).map_err(|error| io_error("open_archive", error))?;
    let mut archive = zip::ZipArchive::new(file).map_err(zip_error)?;
    for planned in &plan.entries {
        let destination = payload.join(&planned.relative_path);
        if planned.is_directory {
            fs::create_dir_all(&destination)
                .map_err(|error| io_error("extract_archive_directory", error))?;
            continue;
        }
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| io_error("extract_archive_parent", error))?;
        }
        let mut entry = archive.by_index(planned.index).map_err(zip_error)?;
        let mut output = fs::File::create(&destination)
            .map_err(|error| io_error("extract_archive_file", error))?;
        std::io::copy(&mut entry, &mut output)
            .map_err(|error| io_error("read_archive_entry", error))?;
        output
            .sync_all()
            .map_err(|error| io_error("sync_archive_file", error))?;
    }
    Ok(())
}

fn validate_extracted_skill(
    payload: &Path,
    wrapped_skill_id: Option<&str>,
) -> Result<String, SkillManagerError> {
    let frontmatter = read_extracted_frontmatter(payload)?;
    if wrapped_skill_id.is_some_and(|wrapped| wrapped != frontmatter.name) {
        return Err(SkillManagerError::new("skill_name_mismatch"));
    }
    Ok(frontmatter.name)
}

fn read_extracted_frontmatter(
    payload: &Path,
) -> Result<super::scanner::SkillFrontmatter, SkillManagerError> {
    let entries = fs::read_dir(payload)
        .map_err(|error| io_error("read_extracted_skill", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| io_error("read_extracted_entry", error))?;
    let entry = entries
        .iter()
        .find(|entry| entry.file_name() == "SKILL.md")
        .or_else(|| entries.iter().find(|entry| entry.file_name() == "skill.md"))
        .ok_or_else(|| SkillManagerError::new("skill_markdown_missing"))?;
    let metadata = entry
        .file_type()
        .map_err(|error| io_error("read_extracted_entry_type", error))?;
    if !metadata.is_file() || metadata.is_symlink() {
        return Err(SkillManagerError::new("skill_markdown_invalid_type"));
    }
    let contents = fs::read_to_string(entry.path())
        .map_err(|error| io_error("read_extracted_markdown", error))?;
    parse_frontmatter(&contents)
}

fn normalize_archive_path(name: &str) -> Result<PathBuf, SkillManagerError> {
    if name.is_empty()
        || name.contains('\0')
        || name.contains('\\')
        || name.starts_with('/')
        || name.starts_with("//")
    {
        return Err(SkillManagerError::new("skill_archive_unsafe_path"));
    }
    let parts = name
        .split('/')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.is_empty()
        || parts.iter().any(|part| *part == "." || *part == "..")
        || parts[0].contains(':')
    {
        return Err(SkillManagerError::new("skill_archive_unsafe_path"));
    }
    Ok(parts.iter().collect())
}

fn validate_archive_entry_type(
    unix_mode: Option<u32>,
    is_directory: bool,
) -> Result<(), SkillManagerError> {
    let Some(mode) = unix_mode else {
        return Ok(());
    };
    let kind = mode & 0o170000;
    let allowed = if is_directory {
        kind == 0 || kind == 0o040000
    } else {
        kind == 0 || kind == 0o100000
    };
    if allowed {
        Ok(())
    } else {
        Err(SkillManagerError::new("skill_archive_special_entry"))
    }
}

fn write_export_directory<W: Write + Seek>(
    writer: &mut zip::ZipWriter<W>,
    root: &Path,
    directory: &Path,
    skill_id: &str,
    options: FileOptions,
) -> Result<(), SkillManagerError> {
    let mut entries = fs::read_dir(directory)
        .map_err(|error| io_error("read_export_directory", error))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| io_error("read_export_entry", error))?;
    entries.sort_by_key(fs::DirEntry::file_name);
    if entries.is_empty() {
        let relative = directory
            .strip_prefix(root)
            .map_err(|_| SkillManagerError::new("skill_path_outside_root"))?;
        let name = archive_name(skill_id, relative, true);
        writer.add_directory(name, options).map_err(zip_error)?;
    }
    for entry in entries {
        let relative = entry
            .path()
            .strip_prefix(root)
            .map_err(|_| SkillManagerError::new("skill_path_outside_root"))?
            .to_path_buf();
        if relative == Path::new(".promptclip-sync.json")
            || relative
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with(".promptclip-") && name.ends_with(".tmp"))
        {
            continue;
        }
        let file_type = entry
            .file_type()
            .map_err(|error| io_error("read_export_file_type", error))?;
        if file_type.is_symlink() {
            return Err(SkillManagerError::new("skill_content_symlink"));
        }
        if file_type.is_dir() {
            write_export_directory(writer, root, &entry.path(), skill_id, options)?;
        } else if file_type.is_file() {
            writer
                .start_file(archive_name(skill_id, &relative, false), options)
                .map_err(zip_error)?;
            let mut input = fs::File::open(entry.path())
                .map_err(|error| io_error("open_export_file", error))?;
            std::io::copy(&mut input, writer)
                .map_err(|error| io_error("write_export_file", error))?;
        } else {
            return Err(SkillManagerError::new("skill_content_special_file"));
        }
    }
    Ok(())
}

fn archive_name(skill_id: &str, relative: &Path, directory: bool) -> String {
    let relative = relative.to_string_lossy().replace('\\', "/");
    let mut name = if relative.is_empty() {
        format!("{skill_id}/")
    } else {
        format!("{skill_id}/{relative}")
    };
    if directory && !name.ends_with('/') {
        name.push('/');
    }
    name
}

fn validate_archive_extension(path: &Path) -> Result<(), SkillManagerError> {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("zip") => Ok(()),
        Some(extension) if extension.eq_ignore_ascii_case("skill") => Ok(()),
        _ => Err(SkillManagerError::new("skill_archive_extension_invalid")),
    }
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn zip_error(error: zip::result::ZipError) -> SkillManagerError {
    SkillManagerError::new("skill_archive_invalid").with_param("message", error.to_string())
}

fn io_error(operation: &str, error: std::io::Error) -> SkillManagerError {
    SkillManagerError::new("skill_io_error")
        .with_param("operation", operation)
        .with_param("message", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{export_skill_archive, import_skill_archive, preview_skill_archive};
    use crate::skills::import::{ImportDecision, ImportOutcome};
    use std::fs;
    use std::io::Write;
    use std::path::Path;
    use tempfile::tempdir;
    use zip::write::FileOptions;

    fn write_skill(path: &Path, skill_id: &str) {
        fs::create_dir_all(path).expect("skill directory should be created");
        fs::write(
            path.join("SKILL.md"),
            format!("---\nname: {skill_id}\ndescription: Archive test\n---\n"),
        )
        .expect("SKILL.md should be written");
        fs::write(path.join("notes.txt"), "notes").expect("notes should be written");
    }

    fn write_archive(path: &Path, entries: &[(&str, &[u8], Option<u32>)]) {
        let file = fs::File::create(path).expect("archive should be created");
        let mut writer = zip::ZipWriter::new(file);
        for (name, contents, mode) in entries {
            let mut options =
                FileOptions::default().compression_method(zip::CompressionMethod::Stored);
            if let Some(mode) = mode {
                options = options.unix_permissions(*mode);
            }
            writer
                .start_file(*name, options)
                .expect("entry should start");
            writer.write_all(contents).expect("entry should write");
        }
        writer.finish().expect("archive should finish");
    }

    fn mark_entry_as_symlink(path: &Path, target_name: &str) {
        let mut bytes = fs::read(path).expect("archive should read");
        let mut offset = 0;
        while offset + 46 <= bytes.len() {
            if bytes[offset..].starts_with(b"PK\x01\x02") {
                let name_length =
                    u16::from_le_bytes([bytes[offset + 28], bytes[offset + 29]]) as usize;
                let name_start = offset + 46;
                let name_end = name_start + name_length;
                if name_end <= bytes.len() && &bytes[name_start..name_end] == target_name.as_bytes()
                {
                    bytes[offset + 5] = 3;
                    let attributes = (0o120777_u32 << 16).to_le_bytes();
                    bytes[offset + 38..offset + 42].copy_from_slice(&attributes);
                    fs::write(path, bytes).expect("patched archive should write");
                    return;
                }
                offset = name_end;
            } else {
                offset += 1;
            }
        }
        panic!("central directory entry should exist");
    }

    #[test]
    fn should_export_and_reimport_single_skill_zip() {
        let temp = tempdir().expect("temp directory should be created");
        let source = temp.path().join("source/archive-skill");
        let archive = temp.path().join("archive-skill.zip");
        let hub = temp.path().join("hub");
        let extraction = temp.path().join("temp");
        write_skill(&source, "archive-skill");

        export_skill_archive(&source, &archive, "archive-skill").expect("skill should export");
        let preview = preview_skill_archive(&archive, &extraction).expect("archive should preview");
        let outcome =
            import_skill_archive(&archive, &hub, &extraction, ImportDecision::UseExternal)
                .expect("archive should import");

        assert_eq!(outcome, ImportOutcome::Imported);
        assert_eq!(preview.skill_id, "archive-skill");
        assert_eq!(preview.description, "Archive test");
        assert!(preview.entry_count >= 2);
        assert_eq!(
            fs::read_to_string(hub.join("archive-skill/notes.txt")).expect("notes should read"),
            "notes"
        );
    }

    #[test]
    fn should_reject_zip_slip_without_writing_outside_extraction_root() {
        let temp = tempdir().expect("temp directory should be created");
        let archive = temp.path().join("malicious.zip");
        write_archive(
            &archive,
            &[
                (
                    "safe/SKILL.md",
                    b"---\nname: safe\ndescription: Safe\n---\n",
                    None,
                ),
                ("../escaped.txt", b"escaped", None),
            ],
        );

        let result = import_skill_archive(
            &archive,
            &temp.path().join("hub"),
            &temp.path().join("extract"),
            ImportDecision::UseExternal,
        );

        assert_eq!(
            result.expect_err("Zip Slip must fail").code,
            "skill_archive_unsafe_path"
        );
        assert!(!temp.path().join("escaped.txt").exists());
    }

    #[test]
    fn should_reject_duplicate_normalized_entry_and_multiple_skill_roots() {
        let temp = tempdir().expect("temp directory should be created");
        let duplicate = temp.path().join("duplicate.zip");
        write_archive(
            &duplicate,
            &[
                (
                    "one/SKILL.md",
                    b"---\nname: one\ndescription: One\n---\n",
                    None,
                ),
                ("one//SKILL.md", b"duplicate", None),
            ],
        );
        let multiple = temp.path().join("multiple.zip");
        write_archive(
            &multiple,
            &[
                (
                    "one/SKILL.md",
                    b"---\nname: one\ndescription: One\n---\n",
                    None,
                ),
                (
                    "two/SKILL.md",
                    b"---\nname: two\ndescription: Two\n---\n",
                    None,
                ),
            ],
        );

        let duplicate_result = import_skill_archive(
            &duplicate,
            &temp.path().join("hub"),
            &temp.path().join("extract-duplicate"),
            ImportDecision::UseExternal,
        );
        let multiple_result = import_skill_archive(
            &multiple,
            &temp.path().join("hub"),
            &temp.path().join("extract-multiple"),
            ImportDecision::UseExternal,
        );

        assert_eq!(
            duplicate_result.expect_err("duplicate must fail").code,
            "skill_archive_duplicate_path"
        );
        assert_eq!(
            multiple_result.expect_err("multiple roots must fail").code,
            "skill_archive_multiple_roots"
        );
    }

    #[test]
    fn should_reject_symlink_entry() {
        let temp = tempdir().expect("temp directory should be created");
        let archive = temp.path().join("symlink.skill");
        write_archive(
            &archive,
            &[
                (
                    "linked/SKILL.md",
                    b"---\nname: linked\ndescription: Linked\n---\n",
                    None,
                ),
                ("linked/escape", b"../../outside", Some(0o120777)),
            ],
        );
        mark_entry_as_symlink(&archive, "linked/escape");

        let result = import_skill_archive(
            &archive,
            &temp.path().join("hub"),
            &temp.path().join("extract"),
            ImportDecision::UseExternal,
        );

        assert_eq!(
            result.expect_err("symlink must fail").code,
            "skill_archive_special_entry"
        );
    }
}
