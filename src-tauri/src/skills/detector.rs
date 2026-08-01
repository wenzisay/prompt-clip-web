use std::path::{Path, PathBuf};

use super::models::{AgentTool, DetectionReason, SkillManagerSettings, SyncMode, ToolSyncMode};
use super::registry::{builtin_tool_definitions, target_group_id};

pub fn detect_tools(
    home_dir: &Path,
    executable_directories: &[PathBuf],
    settings: &SkillManagerSettings,
) -> Vec<AgentTool> {
    builtin_tool_definitions()
        .iter()
        .map(|definition| {
            let default_config_path = home_dir.join(definition.config_dir);
            let config_path = if default_config_path.exists() {
                default_config_path
            } else {
                definition
                    .alternative_config_dirs
                    .iter()
                    .map(|path| home_dir.join(path))
                    .find(|path| path.exists())
                    .unwrap_or(default_config_path)
            };
            let config_exists = config_path.exists();
            let cli_exists = definition
                .cli_command
                .is_some_and(|command| executable_exists(command, executable_directories));
            let mut detection_reasons = Vec::new();
            if config_exists {
                detection_reasons.push(DetectionReason::Config);
            }
            if cli_exists {
                detection_reasons.push(DetectionReason::Cli);
            }
            let sync_mode = settings
                .tool_overrides
                .get(definition.id)
                .copied()
                .unwrap_or(ToolSyncMode::Inherit);
            let effective_sync_mode = if definition.copy_only {
                SyncMode::Copy
            } else {
                match sync_mode {
                    ToolSyncMode::Inherit => settings.default_sync_mode,
                    ToolSyncMode::Symlink => SyncMode::Symlink,
                    ToolSyncMode::Copy => SyncMode::Copy,
                }
            };
            let skills_path = config_path.join("skills");

            AgentTool {
                id: definition.id.to_string(),
                name: definition.name.to_string(),
                installed: config_exists || cli_exists,
                detection_reasons,
                target_group_id: target_group_id(&skills_path),
                config_path,
                skills_path,
                sync_mode,
                effective_sync_mode,
                copy_only: definition.copy_only,
                icon_id: definition.id.to_string(),
            }
        })
        .collect()
}

fn executable_exists(command: &str, executable_directories: &[PathBuf]) -> bool {
    executable_directories
        .iter()
        .any(|directory| executable_in_directory(command, directory))
}

#[cfg(unix)]
fn executable_in_directory(command: &str, directory: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;

    let path = directory.join(command);
    path.metadata()
        .map(|metadata| metadata.is_file() && metadata.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(windows)]
fn executable_in_directory(command: &str, directory: &Path) -> bool {
    ["", ".exe", ".cmd", ".bat"]
        .iter()
        .map(|extension| directory.join(format!("{command}{extension}")))
        .any(|path| path.is_file())
}

#[cfg(test)]
mod tests {
    use super::detect_tools;
    use crate::skills::models::{DetectionReason, SkillManagerSettings};
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn should_detect_tools_from_config_directories() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".claude"))
            .expect("Claude directory should be created");
        fs::create_dir_all(home.path().join(".agents/skills"))
            .expect("Agents directory should be created");

        let tools = detect_tools(home.path(), &[], &SkillManagerSettings::default());
        let claude = tools
            .iter()
            .find(|tool| tool.id == "claude-code")
            .expect("Claude should exist");
        let agents = tools
            .iter()
            .find(|tool| tool.id == "agents-skills")
            .expect("Agents Skills should exist");

        assert!(claude.installed);
        assert_eq!(claude.detection_reasons, vec![DetectionReason::Config]);
        assert!(agents.installed);
        assert_eq!(agents.detection_reasons, vec![DetectionReason::Config]);
    }

    #[test]
    fn should_prefer_existing_opencode_alternative_directory() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".opencode"))
            .expect("OpenCode directory should be created");

        let tools = detect_tools(home.path(), &[], &SkillManagerSettings::default());
        let opencode = tools
            .iter()
            .find(|tool| tool.id == "opencode")
            .expect("OpenCode should exist");

        assert_eq!(opencode.config_path, home.path().join(".opencode"));
        assert_eq!(opencode.skills_path, home.path().join(".opencode/skills"));
    }

    #[cfg(unix)]
    #[test]
    fn should_detect_tools_from_executable_path() {
        use std::os::unix::fs::PermissionsExt;

        let home = tempdir().expect("home should be created");
        let bin = tempdir().expect("bin should be created");
        let codex_path = bin.path().join("codex");
        fs::write(&codex_path, "#!/bin/sh\n").expect("CLI should be written");
        fs::set_permissions(&codex_path, fs::Permissions::from_mode(0o755))
            .expect("CLI should be executable");

        let tools = detect_tools(
            home.path(),
            &[bin.path().to_path_buf()],
            &SkillManagerSettings::default(),
        );
        let codex = tools
            .iter()
            .find(|tool| tool.id == "codex")
            .expect("Codex should exist");

        assert!(codex.installed);
        assert_eq!(codex.detection_reasons, vec![DetectionReason::Cli]);
    }
}
