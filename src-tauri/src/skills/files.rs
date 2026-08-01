use super::models::{SkillFileEntry, SkillManagerError, SkillTextFile};
use super::paths::SkillPaths;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_TEXT_FILE_SIZE: u64 = 2 * 1024 * 1024;
const TEXT_EXTENSIONS: &[&str] = &[
    "css", "csv", "html", "js", "json", "jsx", "md", "markdown", "py", "rs", "sh", "toml", "ts",
    "tsx", "txt", "xml", "yaml", "yml",
];

pub fn list_skill_files(
    paths: &SkillPaths,
    skill_id: &str,
) -> Result<Vec<SkillFileEntry>, SkillManagerError> {
    let root = checked_skill_root(paths, skill_id)?;
    list_directory(&root, &root)
}

pub fn read_text_file(
    paths: &SkillPaths,
    skill_id: &str,
    relative_path: &Path,
) -> Result<SkillTextFile, SkillManagerError> {
    let path = paths.resolve_skill_path(skill_id, relative_path)?;
    let metadata = regular_file_metadata(&path)?;
    if metadata.len() > MAX_TEXT_FILE_SIZE {
        return Err(SkillManagerError::new("skill_file_too_large"));
    }
    if !is_text_path(&path) {
        return Err(SkillManagerError::new("skill_file_not_text"));
    }
    let content =
        fs::read_to_string(&path).map_err(|_| SkillManagerError::new("skill_file_not_utf8"))?;
    Ok(SkillTextFile {
        relative_path: relative_path_string(relative_path),
        content,
        modified_at_ms: modified_at_ms(&metadata)?,
        is_markdown: is_markdown_path(&path),
    })
}

pub fn write_text_file(
    paths: &SkillPaths,
    skill_id: &str,
    relative_path: &Path,
    content: &str,
    expected_modified_at_ms: Option<u64>,
) -> Result<SkillTextFile, SkillManagerError> {
    if content.len() as u64 > MAX_TEXT_FILE_SIZE {
        return Err(SkillManagerError::new("skill_file_too_large"));
    }
    let path = paths.resolve_skill_path(skill_id, relative_path)?;
    let metadata = regular_file_metadata(&path)?;
    if !is_text_path(&path) {
        return Err(SkillManagerError::new("skill_file_not_text"));
    }
    if expected_modified_at_ms.is_some_and(|expected| {
        modified_at_ms(&metadata)
            .map(|actual| actual != expected)
            .unwrap_or(true)
    }) {
        return Err(SkillManagerError::new("skill_file_conflict"));
    }
    atomic_write(&path, content.as_bytes())?;
    read_text_file(paths, skill_id, relative_path)
}

pub fn create_directory(
    paths: &SkillPaths,
    skill_id: &str,
    relative_path: &Path,
) -> Result<(), SkillManagerError> {
    let path = paths.resolve_skill_path(skill_id, relative_path)?;
    ensure_parent_directory(&path)?;
    fs::create_dir(&path).map_err(|error| io_error("create_skill_directory", error))
}

pub fn create_skill(
    paths: &SkillPaths,
    skill_id: &str,
    description: &str,
) -> Result<(), SkillManagerError> {
    let description = description.trim();
    if description.is_empty() || description.chars().count() > 500 {
        return Err(SkillManagerError::new("skill_description_invalid"));
    }
    let root = paths.skill_root(skill_id)?;
    match fs::create_dir(&root) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            return Err(SkillManagerError::new("skill_already_exists"));
        }
        Err(error) => return Err(io_error("create_skill", error)),
    }
    let escaped_description = description.replace('\'', "''");
    let content = format!(
        "---\nname: {skill_id}\ndescription: '{escaped_description}'\n---\n\n# {skill_id}\n"
    );
    if let Err(error) = atomic_create(&root.join("SKILL.md"), content.as_bytes()) {
        let _ = fs::remove_dir(&root);
        return Err(error);
    }
    Ok(())
}

pub fn create_text_file(
    paths: &SkillPaths,
    skill_id: &str,
    relative_path: &Path,
) -> Result<SkillTextFile, SkillManagerError> {
    if !is_text_path(relative_path) {
        return Err(SkillManagerError::new("skill_file_not_text"));
    }
    let path = paths.resolve_skill_path(skill_id, relative_path)?;
    ensure_parent_directory(&path)?;
    atomic_create(&path, b"")?;
    read_text_file(paths, skill_id, relative_path)
}

pub fn rename_entry(
    paths: &SkillPaths,
    skill_id: &str,
    source_relative_path: &Path,
    destination_relative_path: &Path,
) -> Result<(), SkillManagerError> {
    protect_entry(source_relative_path)?;
    protect_entry(destination_relative_path)?;
    let source = paths.resolve_skill_path(skill_id, source_relative_path)?;
    let destination = paths.resolve_skill_path(skill_id, destination_relative_path)?;
    let metadata = fs::symlink_metadata(&source)
        .map_err(|error| io_error("read_skill_entry_metadata", error))?;
    if metadata.file_type().is_symlink() {
        return Err(SkillManagerError::new("skill_content_symlink"));
    }
    if destination.exists() {
        return Err(SkillManagerError::new("skill_entry_exists"));
    }
    ensure_parent_directory(&destination)?;
    fs::rename(source, destination).map_err(|error| io_error("rename_skill_entry", error))
}

pub fn upload_file(
    paths: &SkillPaths,
    skill_id: &str,
    source: &Path,
    destination_relative_path: &Path,
) -> Result<(), SkillManagerError> {
    if !source.is_absolute() {
        return Err(SkillManagerError::new("skill_dialog_path_invalid"));
    }
    let source_metadata = fs::symlink_metadata(source)
        .map_err(|error| io_error("read_skill_upload_metadata", error))?;
    if source_metadata.file_type().is_symlink() || !source_metadata.is_file() {
        return Err(SkillManagerError::new("skill_upload_invalid_type"));
    }
    let destination = paths.resolve_skill_path(skill_id, destination_relative_path)?;
    ensure_parent_directory(&destination)?;
    let content = fs::read(source).map_err(|error| io_error("read_skill_upload", error))?;
    atomic_create(&destination, &content)
}

pub fn download_file(
    paths: &SkillPaths,
    skill_id: &str,
    source_relative_path: &Path,
    destination: &Path,
) -> Result<(), SkillManagerError> {
    if !destination.is_absolute() {
        return Err(SkillManagerError::new("skill_dialog_path_invalid"));
    }
    let source = paths.resolve_skill_path(skill_id, source_relative_path)?;
    regular_file_metadata(&source)?;
    let content = fs::read(source).map_err(|error| io_error("read_skill_download", error))?;
    if destination.exists() {
        atomic_write(destination, &content)
    } else {
        atomic_create(destination, &content)
    }
}

pub fn delete_entry(
    paths: &SkillPaths,
    skill_id: &str,
    relative_path: &Path,
) -> Result<(), SkillManagerError> {
    protect_entry(relative_path)?;
    let path = paths.resolve_skill_path(skill_id, relative_path)?;
    let metadata = fs::symlink_metadata(&path)
        .map_err(|error| io_error("read_skill_entry_metadata", error))?;
    if metadata.file_type().is_symlink() {
        return Err(SkillManagerError::new("skill_content_symlink"));
    }
    if metadata.is_dir() {
        ensure_tree_has_no_links(&path)?;
        fs::remove_dir_all(&path).map_err(|error| io_error("delete_skill_directory", error))
    } else if metadata.is_file() {
        fs::remove_file(&path).map_err(|error| io_error("delete_skill_file", error))
    } else {
        Err(SkillManagerError::new("skill_content_special_file"))
    }
}

fn checked_skill_root(paths: &SkillPaths, skill_id: &str) -> Result<PathBuf, SkillManagerError> {
    let root = paths.skill_root(skill_id)?;
    let metadata =
        fs::symlink_metadata(&root).map_err(|_| SkillManagerError::new("skill_not_found"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(SkillManagerError::new("skill_source_invalid"));
    }
    Ok(root)
}

fn list_directory(root: &Path, directory: &Path) -> Result<Vec<SkillFileEntry>, SkillManagerError> {
    let mut paths = fs::read_dir(directory)
        .map_err(|error| io_error("read_skill_directory", error))?
        .map(|entry| {
            entry
                .map(|item| item.path())
                .map_err(|error| io_error("read_skill_entry", error))
        })
        .collect::<Result<Vec<_>, _>>()?;
    paths.sort_by(|left, right| left.file_name().cmp(&right.file_name()));
    paths
        .into_iter()
        .map(|path| build_entry(root, &path))
        .collect()
}

fn build_entry(root: &Path, path: &Path) -> Result<SkillFileEntry, SkillManagerError> {
    let metadata =
        fs::symlink_metadata(path).map_err(|error| io_error("read_skill_entry_metadata", error))?;
    if metadata.file_type().is_symlink() {
        return Err(SkillManagerError::new("skill_content_symlink"));
    }
    if !metadata.is_dir() && !metadata.is_file() {
        return Err(SkillManagerError::new("skill_content_special_file"));
    }
    let relative = path
        .strip_prefix(root)
        .map_err(|_| SkillManagerError::new("skill_path_outside_root"))?;
    let is_directory = metadata.is_dir();
    Ok(SkillFileEntry {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| SkillManagerError::new("skill_path_not_utf8"))?
            .to_string(),
        relative_path: relative_path_string(relative),
        is_directory,
        is_text: !is_directory && is_text_path(path),
        is_markdown: !is_directory && is_markdown_path(path),
        size: if is_directory { 0 } else { metadata.len() },
        modified_at_ms: modified_at_ms(&metadata)?,
        children: if is_directory {
            list_directory(root, path)?
        } else {
            Vec::new()
        },
    })
}

fn regular_file_metadata(path: &Path) -> Result<fs::Metadata, SkillManagerError> {
    let metadata =
        fs::symlink_metadata(path).map_err(|error| io_error("read_skill_file_metadata", error))?;
    if metadata.file_type().is_symlink() {
        return Err(SkillManagerError::new("skill_content_symlink"));
    }
    if !metadata.is_file() {
        return Err(SkillManagerError::new("skill_file_invalid_type"));
    }
    Ok(metadata)
}

fn is_text_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| TEXT_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str()))
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown")
        })
}

fn modified_at_ms(metadata: &fs::Metadata) -> Result<u64, SkillManagerError> {
    metadata
        .modified()
        .unwrap_or(SystemTime::UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .map_err(|_| SkillManagerError::new("skill_file_time_invalid"))
}

fn relative_path_string(path: &Path) -> String {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/")
}

fn protect_entry(path: &Path) -> Result<(), SkillManagerError> {
    if path.components().count() == 1
        && path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.eq_ignore_ascii_case("SKILL.md"))
    {
        return Err(SkillManagerError::new("skill_entry_protected"));
    }
    Ok(())
}

fn ensure_parent_directory(path: &Path) -> Result<(), SkillManagerError> {
    let parent = path
        .parent()
        .ok_or_else(|| SkillManagerError::new("skill_parent_missing"))?;
    let metadata = fs::symlink_metadata(parent)
        .map_err(|error| io_error("read_skill_parent_metadata", error))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(SkillManagerError::new("skill_parent_invalid"));
    }
    Ok(())
}

fn ensure_tree_has_no_links(directory: &Path) -> Result<(), SkillManagerError> {
    for entry in fs::read_dir(directory).map_err(|error| io_error("read_skill_directory", error))? {
        let entry = entry.map_err(|error| io_error("read_skill_entry", error))?;
        let metadata = fs::symlink_metadata(entry.path())
            .map_err(|error| io_error("read_skill_entry_metadata", error))?;
        if metadata.file_type().is_symlink() {
            return Err(SkillManagerError::new("skill_content_symlink"));
        }
        if metadata.is_dir() {
            ensure_tree_has_no_links(&entry.path())?;
        } else if !metadata.is_file() {
            return Err(SkillManagerError::new("skill_content_special_file"));
        }
    }
    Ok(())
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<(), SkillManagerError> {
    let parent = path
        .parent()
        .ok_or_else(|| SkillManagerError::new("skill_parent_missing"))?;
    let temporary = parent.join(format!(
        ".promptclip-edit-{}-{}.tmp",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    ));
    let result = (|| {
        let mut file = fs::File::create(&temporary)
            .map_err(|error| io_error("create_skill_temporary_file", error))?;
        file.write_all(content)
            .map_err(|error| io_error("write_skill_temporary_file", error))?;
        file.sync_all()
            .map_err(|error| io_error("sync_skill_temporary_file", error))?;
        replace_existing_file(&temporary, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

#[cfg(not(windows))]
fn replace_existing_file(temporary: &Path, destination: &Path) -> Result<(), SkillManagerError> {
    fs::rename(temporary, destination).map_err(|error| io_error("replace_skill_file", error))
}

#[cfg(windows)]
fn replace_existing_file(temporary: &Path, destination: &Path) -> Result<(), SkillManagerError> {
    let backup = destination.with_extension(format!(
        "promptclip-backup-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    ));
    fs::rename(destination, &backup).map_err(|error| io_error("backup_skill_file", error))?;
    match fs::rename(temporary, destination) {
        Ok(()) => {
            fs::remove_file(&backup).map_err(|error| io_error("remove_skill_file_backup", error))
        }
        Err(error) => match fs::rename(&backup, destination) {
            Ok(()) => Err(io_error("replace_skill_file", error)),
            Err(rollback_error) => Err(SkillManagerError::new("skill_file_rollback_failed")
                .with_param("message", rollback_error.to_string())),
        },
    }
}

fn atomic_create(path: &Path, content: &[u8]) -> Result<(), SkillManagerError> {
    use std::fs::OpenOptions;

    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::AlreadyExists {
                SkillManagerError::new("skill_entry_exists")
            } else {
                io_error("create_skill_file", error)
            }
        })?;
    if let Err(error) = file.write_all(content).and_then(|_| file.sync_all()) {
        drop(file);
        let _ = fs::remove_file(path);
        return Err(io_error("write_skill_file", error));
    }
    Ok(())
}

fn io_error(operation: &str, error: std::io::Error) -> SkillManagerError {
    SkillManagerError::new("skill_io_error")
        .with_param("operation", operation)
        .with_param("message", error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        create_directory, create_skill, create_text_file, delete_entry, download_file,
        list_skill_files, read_text_file, rename_entry, upload_file, write_text_file,
    };
    use crate::skills::paths::SkillPaths;
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    fn create_fixture() -> (tempfile::TempDir, SkillPaths) {
        let home = tempdir().expect("home should be created");
        let paths = SkillPaths::new(home.path());
        paths.initialize().expect("hub should initialize");
        let root = paths
            .skill_root("demo-skill")
            .expect("skill id should be valid");
        fs::create_dir_all(root.join("references")).expect("skill tree should be created");
        fs::write(
            root.join("SKILL.md"),
            "---\nname: demo-skill\ndescription: Demo\n---\n\nBody\n",
        )
        .expect("entry file should be created");
        fs::write(root.join("references/notes.txt"), "Notes").expect("text file should be created");
        fs::write(root.join("asset.bin"), [0, 159, 146, 150])
            .expect("binary file should be created");
        (home, paths)
    }

    #[test]
    fn should_list_nested_files_and_classify_text_and_binary_content() {
        let (_home, paths) = create_fixture();

        let entries = list_skill_files(&paths, "demo-skill").expect("tree should load");

        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].relative_path, "SKILL.md");
        assert!(entries[0].is_text);
        assert!(entries[0].is_markdown);
        assert_eq!(entries[2].children[0].relative_path, "references/notes.txt");
    }

    #[test]
    fn should_read_text_and_reject_binary_or_oversized_files() {
        let (_home, paths) = create_fixture();

        let text =
            read_text_file(&paths, "demo-skill", Path::new("SKILL.md")).expect("text should load");
        let binary = read_text_file(&paths, "demo-skill", Path::new("asset.bin"));
        fs::write(
            paths
                .skill_root("demo-skill")
                .expect("skill root should resolve")
                .join("large.txt"),
            vec![b'a'; 2 * 1024 * 1024 + 1],
        )
        .expect("large file should be created");
        let large = read_text_file(&paths, "demo-skill", Path::new("large.txt"));

        assert!(text.content.contains("Body"));
        assert_eq!(
            binary.expect_err("binary should fail").code,
            "skill_file_not_text"
        );
        assert_eq!(
            large.expect_err("large file should fail").code,
            "skill_file_too_large"
        );
    }

    #[test]
    fn should_reject_stale_write_and_preserve_external_content() {
        let (_home, paths) = create_fixture();
        let original =
            read_text_file(&paths, "demo-skill", Path::new("SKILL.md")).expect("text should load");
        let entry = paths
            .skill_root("demo-skill")
            .expect("skill root should resolve")
            .join("SKILL.md");
        std::thread::sleep(std::time::Duration::from_millis(2));
        fs::write(&entry, "externally changed").expect("external write should succeed");

        let result = write_text_file(
            &paths,
            "demo-skill",
            Path::new("SKILL.md"),
            "editor content",
            Some(original.modified_at_ms),
        );

        assert_eq!(
            result.expect_err("stale write should fail").code,
            "skill_file_conflict"
        );
        assert_eq!(
            fs::read_to_string(entry).expect("file should remain"),
            "externally changed"
        );
    }

    #[test]
    fn should_protect_skill_markdown_and_reject_path_escape() {
        let (_home, paths) = create_fixture();

        let protected = delete_entry(&paths, "demo-skill", Path::new("SKILL.md"));
        let escaped = create_directory(&paths, "demo-skill", Path::new("../outside"));

        assert_eq!(
            protected.expect_err("entry should be protected").code,
            "skill_entry_protected"
        );
        assert_eq!(
            escaped.expect_err("escape should fail").code,
            "invalid_path"
        );
    }

    #[test]
    fn should_create_skill_with_valid_frontmatter_and_reject_duplicate() {
        let home = tempdir().expect("home should be created");
        let paths = SkillPaths::new(home.path());
        paths.initialize().expect("hub should initialize");

        create_skill(&paths, "new-skill", "A skill: with YAML characters")
            .expect("skill should be created");
        let duplicate = create_skill(&paths, "new-skill", "Duplicate");
        let content = fs::read_to_string(
            paths
                .skill_root("new-skill")
                .expect("skill root should resolve")
                .join("SKILL.md"),
        )
        .expect("entry should load");

        assert!(content.contains("name: new-skill"));
        assert!(content.contains("description: 'A skill: with YAML characters'"));
        assert_eq!(
            duplicate.expect_err("duplicate should fail").code,
            "skill_already_exists"
        );
    }

    #[test]
    fn should_create_rename_upload_and_download_files_without_overwriting() {
        let (home, paths) = create_fixture();
        create_text_file(&paths, "demo-skill", Path::new("draft.txt"))
            .expect("text file should be created");
        rename_entry(
            &paths,
            "demo-skill",
            Path::new("draft.txt"),
            Path::new("final.txt"),
        )
        .expect("file should be renamed");
        let upload_source = home.path().join("upload.dat");
        fs::write(&upload_source, [1, 2, 3]).expect("upload source should be created");
        upload_file(
            &paths,
            "demo-skill",
            &upload_source,
            Path::new("references/upload.dat"),
        )
        .expect("file should upload");
        let duplicate = upload_file(
            &paths,
            "demo-skill",
            &upload_source,
            Path::new("references/upload.dat"),
        );
        let destination = home.path().join("download.dat");
        download_file(
            &paths,
            "demo-skill",
            Path::new("references/upload.dat"),
            &destination,
        )
        .expect("file should download");

        assert!(paths
            .skill_root("demo-skill")
            .expect("skill root should resolve")
            .join("final.txt")
            .is_file());
        assert_eq!(
            duplicate.expect_err("duplicate should fail").code,
            "skill_entry_exists"
        );
        assert_eq!(
            fs::read(destination).expect("download should load"),
            [1, 2, 3]
        );
    }

    #[test]
    fn should_reject_renaming_protected_entry_and_symlink_upload() {
        let (home, paths) = create_fixture();
        let protected = rename_entry(
            &paths,
            "demo-skill",
            Path::new("SKILL.md"),
            Path::new("renamed.md"),
        );

        assert_eq!(
            protected.expect_err("entry should be protected").code,
            "skill_entry_protected"
        );

        #[cfg(unix)]
        {
            let link = home.path().join("upload-link");
            std::os::unix::fs::symlink(home.path().join("missing"), &link)
                .expect("link should be created");
            let result = upload_file(&paths, "demo-skill", &link, Path::new("references/link"));
            assert_eq!(
                result.expect_err("link should fail").code,
                "skill_upload_invalid_type"
            );
        }
    }
}
