use std::path::{Component, Path, PathBuf};

use super::models::ToolDefinition;

const INITIAL_TOOL_DEFINITIONS: &[ToolDefinition] = &[
    ToolDefinition {
        id: "claude-code",
        name: "Claude Code",
        config_dir: ".claude",
        alternative_config_dirs: &[],
        cli_command: Some("claude"),
        copy_only: false,
    },
    ToolDefinition {
        id: "codex",
        name: "Codex",
        config_dir: ".codex",
        alternative_config_dirs: &[],
        cli_command: Some("codex"),
        copy_only: false,
    },
    ToolDefinition {
        id: "opencode",
        name: "OpenCode",
        config_dir: ".config/opencode",
        alternative_config_dirs: &[".opencode"],
        cli_command: Some("opencode"),
        copy_only: false,
    },
    ToolDefinition {
        id: "cursor",
        name: "Cursor",
        config_dir: ".cursor",
        alternative_config_dirs: &[],
        cli_command: Some("cursor"),
        copy_only: false,
    },
    ToolDefinition {
        id: "agents-skills",
        name: "Agents Skills",
        config_dir: ".agents",
        alternative_config_dirs: &[],
        cli_command: None,
        copy_only: false,
    },
];

pub fn builtin_tool_definitions() -> &'static [ToolDefinition] {
    INITIAL_TOOL_DEFINITIONS
}

fn normalize_lexically(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            _ => normalized.push(component.as_os_str()),
        }
    }
    normalized
}

pub fn target_group_id(skills_path: &Path) -> String {
    let normalized = normalize_lexically(skills_path);
    format!("path:{}", normalized.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::{builtin_tool_definitions, target_group_id};
    use std::path::Path;

    #[test]
    fn should_define_exactly_five_initial_agent_targets() {
        let definitions = builtin_tool_definitions();
        let ids = definitions
            .iter()
            .map(|definition| definition.id)
            .collect::<Vec<_>>();

        assert_eq!(
            ids,
            vec![
                "claude-code",
                "codex",
                "opencode",
                "cursor",
                "agents-skills"
            ]
        );
    }

    #[test]
    fn should_configure_expected_paths_and_detection_rules() {
        let definitions = builtin_tool_definitions();
        let opencode = definitions
            .iter()
            .find(|definition| definition.id == "opencode")
            .expect("OpenCode definition should exist");
        let agents = definitions
            .iter()
            .find(|definition| definition.id == "agents-skills")
            .expect("Agents Skills definition should exist");

        assert_eq!(opencode.config_dir, ".config/opencode");
        assert_eq!(opencode.alternative_config_dirs, &[".opencode"]);
        assert_eq!(opencode.cli_command, Some("opencode"));
        assert_eq!(agents.config_dir, ".agents");
        assert_eq!(agents.cli_command, None);
    }

    #[test]
    fn should_group_equivalent_target_paths_together() {
        assert_eq!(
            target_group_id(Path::new("/Users/test/.agents/skills")),
            target_group_id(Path::new("/Users/test/.agents/./skills"))
        );
    }
}
