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
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "codex",
        name: "Codex",
        config_dir: ".codex",
        alternative_config_dirs: &[],
        cli_command: Some("codex"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "opencode",
        name: "OpenCode",
        config_dir: ".config/opencode",
        alternative_config_dirs: &[".opencode"],
        cli_command: Some("opencode"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "cursor",
        name: "Cursor",
        config_dir: ".cursor",
        alternative_config_dirs: &[],
        cli_command: Some("cursor"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "agents-skills",
        name: "Agents Skills",
        config_dir: ".agents",
        alternative_config_dirs: &[],
        cli_command: None,
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "codebuddy",
        name: "CodeBuddy",
        config_dir: ".codebuddy",
        alternative_config_dirs: &[],
        cli_command: Some("codebuddy"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "gemini",
        name: "Gemini（Antigravity）",
        // Antigravity 与 Gemini CLI 是同一应用，只保留这一项。
        // skill 目录仍是 ~/.gemini/config/skills/，不是 ~/.gemini/skills/。
        config_dir: ".gemini/config",
        alternative_config_dirs: &[],
        cli_command: Some("gemini"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "windsurf",
        name: "Windsurf",
        config_dir: ".windsurf",
        alternative_config_dirs: &[],
        cli_command: Some("windsurf"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "trae",
        name: "Trae",
        config_dir: ".trae",
        alternative_config_dirs: &[],
        cli_command: Some("trae"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "droid",
        name: "Droid",
        config_dir: ".factory",
        alternative_config_dirs: &[".droid"],
        cli_command: Some("droid"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "augment",
        name: "Augment",
        config_dir: ".augment",
        alternative_config_dirs: &[],
        cli_command: Some("augment"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "openclaw",
        name: "OpenClaw",
        config_dir: ".openclaw",
        alternative_config_dirs: &[],
        cli_command: Some("openclaw"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "cline",
        name: "Cline",
        config_dir: ".cline",
        alternative_config_dirs: &[],
        cli_command: Some("cline"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "commandcode",
        name: "CommandCode",
        config_dir: ".commandcode",
        alternative_config_dirs: &[],
        cli_command: Some("commandcode"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "continue",
        name: "Continue",
        config_dir: ".continue",
        alternative_config_dirs: &[],
        cli_command: Some("continue"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "crush",
        name: "Crush",
        config_dir: ".config/crush",
        alternative_config_dirs: &[".crush"],
        cli_command: Some("crush"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "goose",
        name: "Goose",
        config_dir: ".config/goose",
        alternative_config_dirs: &[".goose"],
        cli_command: Some("goose"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "junie",
        name: "Junie",
        config_dir: ".junie",
        alternative_config_dirs: &[],
        cli_command: Some("junie"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "kilo-code",
        name: "Kilo Code",
        config_dir: ".kilocode",
        alternative_config_dirs: &[],
        cli_command: Some("kilo"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "kiro",
        name: "Kiro",
        config_dir: ".kiro",
        alternative_config_dirs: &[],
        cli_command: Some("kiro"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "qoder",
        name: "Qoder",
        config_dir: ".qoder",
        alternative_config_dirs: &[],
        cli_command: Some("qoder"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "qwen-code",
        name: "Qwen Code",
        config_dir: ".qwen",
        alternative_config_dirs: &[],
        cli_command: Some("qwen"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "roo-code",
        name: "Roo Code",
        config_dir: ".roo",
        alternative_config_dirs: &[],
        cli_command: Some("roo"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "zencoder",
        name: "Zencoder",
        config_dir: ".zencoder",
        alternative_config_dirs: &[],
        cli_command: Some("zencoder"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "pi",
        name: "Pi",
        config_dir: ".pi/agent",
        alternative_config_dirs: &[],
        cli_command: Some("pi"),
        copy_only: false,
        reads_shared_agents_skills: true,
    },
    ToolDefinition {
        id: "trae-cn",
        name: "Trae CN",
        config_dir: ".trae-cn",
        alternative_config_dirs: &[],
        cli_command: Some("trae"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "hermes",
        name: "Hermes",
        config_dir: ".hermes",
        alternative_config_dirs: &[],
        cli_command: Some("hermes"),
        copy_only: false,
        reads_shared_agents_skills: false,
    },
    ToolDefinition {
        id: "workbuddy",
        name: "WorkBuddy",
        config_dir: ".workbuddy",
        alternative_config_dirs: &[],
        cli_command: Some("workbuddy"),
        copy_only: false,
        reads_shared_agents_skills: false,
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
    fn should_include_core_and_expanded_builtin_targets() {
        let definitions = builtin_tool_definitions();
        let ids = definitions
            .iter()
            .map(|definition| definition.id)
            .collect::<std::collections::BTreeSet<_>>();

        // 核心工具（首阶段 5 个）必须存在
        for core in [
            "claude-code",
            "codex",
            "opencode",
            "cursor",
            "agents-skills",
        ] {
            assert!(ids.contains(core), "core tool {core} should be defined");
        }
        // 扩展工具必须存在（迁移自 Skills-Manager，剔除废弃的 iflow / qoderwork-cn，
        // 与 agents-skills 路径冲突的 vercel-skills，以及并入 Gemini 的 antigravity）
        for expanded in [
            "codebuddy",
            "gemini",
            "windsurf",
            "trae",
            "droid",
            "augment",
            "openclaw",
            "cline",
            "commandcode",
            "continue",
            "crush",
            "goose",
            "junie",
            "kilo-code",
            "kiro",
            "qoder",
            "qwen-code",
            "roo-code",
            "zencoder",
            "pi",
            "trae-cn",
            "hermes",
            "workbuddy",
        ] {
            assert!(
                ids.contains(expanded),
                "expanded tool {expanded} should be defined"
            );
        }
        // 已废弃/冲突，或已并入其他工具的 id 不应再单独出现
        for excluded in ["iflow", "qoderwork-cn", "vercel-skills", "antigravity"] {
            assert!(
                !ids.contains(excluded),
                "excluded tool {excluded} should not be defined"
            );
        }
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
        let droid = definitions
            .iter()
            .find(|definition| definition.id == "droid")
            .expect("Droid definition should exist");
        let pi = definitions
            .iter()
            .find(|definition| definition.id == "pi")
            .expect("Pi definition should exist");
        let gemini = definitions
            .iter()
            .find(|definition| definition.id == "gemini")
            .expect("Gemini definition should exist");

        assert_eq!(opencode.config_dir, ".config/opencode");
        assert_eq!(opencode.alternative_config_dirs, &[".opencode"]);
        assert_eq!(opencode.cli_command, Some("opencode"));
        assert_eq!(agents.config_dir, ".agents");
        assert_eq!(agents.cli_command, None);
        assert_eq!(droid.config_dir, ".factory");
        assert_eq!(droid.alternative_config_dirs, &[".droid"]);
        assert_eq!(pi.config_dir, ".pi/agent");
        // Gemini（Antigravity）沿用 Gemini CLI 的 skill 目录 ~/.gemini/config/skills/
        assert_eq!(gemini.name, "Gemini（Antigravity）");
        assert_eq!(gemini.config_dir, ".gemini/config");
        assert_eq!(gemini.cli_command, Some("gemini"));
    }

    #[test]
    fn should_group_equivalent_target_paths_together() {
        assert_eq!(
            target_group_id(Path::new("/Users/test/.agents/skills")),
            target_group_id(Path::new("/Users/test/.agents/./skills"))
        );
    }

    #[test]
    fn should_mark_shared_agents_skills_compatibility_on_builtin_tools() {
        let definitions = builtin_tool_definitions();
        let reads_shared = |id: &str| {
            definitions
                .iter()
                .find(|definition| definition.id == id)
                .unwrap_or_else(|| panic!("tool {id} should exist"))
                .reads_shared_agents_skills
        };

        for compatible in [
            "codex",
            "opencode",
            "cursor",
            "gemini",
            "windsurf",
            "droid",
            "augment",
            "cline",
            "goose",
            "kilo-code",
            "roo-code",
            "pi",
        ] {
            assert!(
                reads_shared(compatible),
                "{compatible} should read shared ~/.agents/skills"
            );
        }

        assert!(
            !reads_shared("claude-code"),
            "claude-code should not inherit ~/.agents/skills"
        );
        assert!(
            !reads_shared("agents-skills"),
            "agents-skills itself should not be flagged as inheriting"
        );
    }
}
