use std::fs;
use std::path::{Component, Path, PathBuf};

use super::models::SkillManagerError;

pub struct SkillPaths {
    base_dir: PathBuf,
}

impl SkillPaths {
    pub fn new(home_dir: &Path) -> Self {
        Self {
            base_dir: home_dir.join(".prompt-clip"),
        }
    }

    pub fn base_dir(&self) -> PathBuf {
        self.base_dir.clone()
    }

    pub fn skills_dir(&self) -> PathBuf {
        self.base_dir.join("skills")
    }

    pub fn settings_file(&self) -> PathBuf {
        self.base_dir.join("skill-manager.json")
    }

    pub fn temp_dir(&self) -> PathBuf {
        self.base_dir.join("temp")
    }

    pub fn initialize(&self) -> Result<(), SkillManagerError> {
        fs::create_dir_all(self.base_dir()).map_err(|error| {
            SkillManagerError::new("create_directory_failed")
                .with_param("path", self.base_dir().to_string_lossy())
                .with_param("message", error.to_string())
        })?;
        for directory in [
            self.skills_dir(),
            self.temp_dir().join("imports"),
            self.temp_dir().join("sync"),
        ] {
            fs::create_dir_all(&directory).map_err(|error| {
                SkillManagerError::new("create_directory_failed")
                    .with_param("path", directory.to_string_lossy())
                    .with_param("message", error.to_string())
            })?;
        }
        Ok(())
    }

    pub fn skill_root(&self, skill_id: &str) -> Result<PathBuf, SkillManagerError> {
        validate_skill_id(skill_id)?;
        Ok(self.skills_dir().join(skill_id))
    }

    pub fn resolve_skill_path(
        &self,
        skill_id: &str,
        relative_path: &Path,
    ) -> Result<PathBuf, SkillManagerError> {
        let skill_root = self.skill_root(skill_id)?;
        let relative_path = validate_relative_path(relative_path)?;
        let mut current = skill_root;

        for component in relative_path.components() {
            let Component::Normal(part) = component else {
                continue;
            };
            current.push(part);
            if let Ok(metadata) = fs::symlink_metadata(&current) {
                if metadata.file_type().is_symlink() {
                    return Err(SkillManagerError::new("symlink_not_supported")
                        .with_param("path", current.to_string_lossy()));
                }
            }
        }

        Ok(current)
    }
}

pub(crate) fn validate_skill_id(skill_id: &str) -> Result<(), SkillManagerError> {
    validate_skill_id_with(skill_id, false)
}

/// Stricter variant used by the create-new-skill entrypoint. Keeps the colon
/// forbidden so the name can always be used as a directory on every platform
/// (colon is reserved by the Windows filesystem). Import/scan/read/sync paths
/// use the permissive [`validate_skill_id`] instead.
pub(crate) fn validate_creatable_skill_id(skill_id: &str) -> Result<(), SkillManagerError> {
    validate_skill_id_with(skill_id, true)
}

fn validate_skill_id_with(skill_id: &str, forbid_colon: bool) -> Result<(), SkillManagerError> {
    let valid_length = (1..=64).contains(&skill_id.len());
    let is_separator = |character: u8| character == b'-' || (!forbid_colon && character == b':');
    let valid_characters = skill_id.bytes().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || character == b'-'
            || (!forbid_colon && character == b':')
    });
    let bytes = skill_id.as_bytes();
    let valid_edges = !bytes.is_empty()
        && !is_separator(bytes[0])
        && !is_separator(bytes[bytes.len() - 1]);
    let valid_separators = bytes
        .windows(2)
        .all(|pair| !(is_separator(pair[0]) && is_separator(pair[1])));

    if valid_length && valid_characters && valid_edges && valid_separators {
        return Ok(());
    }

    Err(SkillManagerError::new("invalid_skill_id").with_param("skillId", skill_id))
}

fn validate_relative_path(path: &Path) -> Result<PathBuf, SkillManagerError> {
    if path.as_os_str().is_empty() || path.is_absolute() || path.to_string_lossy().contains('\0') {
        return Err(
            SkillManagerError::new("invalid_path").with_param("path", path.to_string_lossy())
        );
    }

    let mut safe_path = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => safe_path.push(part),
            Component::CurDir => {}
            _ => {
                return Err(SkillManagerError::new("invalid_path")
                    .with_param("path", path.to_string_lossy()));
            }
        }
    }

    if safe_path.as_os_str().is_empty() {
        return Err(
            SkillManagerError::new("invalid_path").with_param("path", path.to_string_lossy())
        );
    }

    Ok(safe_path)
}

#[cfg(test)]
mod tests {
    use super::{validate_creatable_skill_id, validate_skill_id, SkillPaths};
    use std::fs;
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn should_build_fixed_promptclip_paths_from_home() {
        let home = Path::new("/Users/test");
        let paths = SkillPaths::new(home);

        assert_eq!(paths.base_dir(), home.join(".prompt-clip"));
        assert_eq!(paths.skills_dir(), home.join(".prompt-clip/skills"));
        assert_eq!(
            paths.settings_file(),
            home.join(".prompt-clip/skill-manager.json")
        );
    }

    #[test]
    fn should_reject_invalid_skill_ids() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());

        for invalid in [
            "",
            "Uppercase",
            "-leading",
            "trailing-",
            "two--hyphens",
            "../escape",
            ":leading",
            "trailing:",
            "a::b",
            "a:-b",
            "a-:b",
        ] {
            assert!(
                paths.skill_root(invalid).is_err(),
                "{invalid} should be rejected"
            );
        }
    }

    #[test]
    fn should_accept_colon_separated_ids_on_general_path() {
        for valid in ["plugin:skill", "ns:a:b:c", "a:b-c", "plain-skill"] {
            assert!(
                validate_skill_id(valid).is_ok(),
                "{valid} should be accepted by validate_skill_id"
            );
        }
    }

    #[test]
    fn should_forbid_colon_when_creating_a_new_skill() {
        assert!(
            validate_creatable_skill_id("plugin:skill").is_err(),
            "colon-separated id must be rejected for creation"
        );
        assert!(
            validate_creatable_skill_id("a:b-c").is_err(),
            "colon-separated id must be rejected for creation"
        );
        assert!(
            validate_creatable_skill_id("plain-skill").is_ok(),
            "hyphen-only id must be accepted for creation"
        );
        // creation keeps the original strict edge/duplicate rules too
        assert!(validate_creatable_skill_id("-leading").is_err());
        assert!(validate_creatable_skill_id("trailing-").is_err());
        assert!(validate_creatable_skill_id("two--hyphens").is_err());
    }

    #[test]
    fn should_reject_absolute_and_parent_relative_paths() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());

        assert!(paths
            .resolve_skill_path("demo", Path::new("../outside"))
            .is_err());
        assert!(paths
            .resolve_skill_path("demo", Path::new("/tmp/outside"))
            .is_err());
    }

    #[cfg(unix)]
    #[test]
    fn should_reject_symlink_components_inside_skill() {
        let temp = tempdir().expect("temp directory should be created");
        let paths = SkillPaths::new(temp.path());
        paths.initialize().expect("hub should initialize");
        let skill_root = paths.skill_root("demo").expect("skill id should be valid");
        fs::create_dir_all(&skill_root).expect("skill root should be created");
        std::os::unix::fs::symlink(temp.path(), skill_root.join("linked"))
            .expect("symlink should be created");

        assert!(paths
            .resolve_skill_path("demo", Path::new("linked/outside.txt"))
            .is_err());
    }
}
