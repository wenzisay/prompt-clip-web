use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::models::{
    AgentTool, DetectionReason, SkillManagerSettings, SyncMode, ToolSource, ToolSyncMode,
};
use super::registry::{builtin_tool_definitions, target_group_id};

pub fn detect_tools(
    home_dir: &Path,
    executable_directories: &[PathBuf],
    settings: &SkillManagerSettings,
) -> Vec<AgentTool> {
    let mut tools: Vec<AgentTool> = builtin_tool_definitions()
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
            let skills_path = config_path.join("skills");
            build_agent_tool(
                definition.id,
                definition.name,
                skills_path,
                config_path,
                detection_reasons,
                config_exists || cli_exists,
                definition.copy_only,
                settings,
            )
        })
        .collect();

    // 追加用户自定义工具：直接以用户给定的 skills 路径为准。
    // installed 判定 = skills 路径的父目录存在；无 cli / 无 config_dir 概念。
    for custom in &settings.custom_tools {
        let parent_exists = custom
            .skills_path
            .parent()
            .is_some_and(|parent| parent.exists());
        let config_path = custom
            .skills_path
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| custom.skills_path.clone());
        let detection_reasons = if parent_exists {
            vec![DetectionReason::Config]
        } else {
            Vec::new()
        };
        let tool = build_agent_tool(
            &custom.id,
            &custom.name,
            custom.skills_path.clone(),
            config_path,
            detection_reasons,
            parent_exists,
            false,
            settings,
        )
        .with_source(ToolSource::Custom)
        .with_icon_id("agents-skills".to_string());
        tools.push(tool);
    }

    // 应用用户自定义顺序：tool_order 中的 id 按其位置排，
    // 未出现的（新增工具/迁移老用户）追加到末尾，彼此保持原相对顺序。
    apply_tool_order(&mut tools, &settings.tool_order);

    tools
}

/// 根据 tool_order（tool id 数组）对 tools 稳定排序。
/// 空数组保持原序（默认行为）。未在 order 中的工具排末尾。
fn apply_tool_order(tools: &mut Vec<AgentTool>, order: &[String]) {
    if order.is_empty() {
        return;
    }
    let position: HashMap<&str, usize> = order
        .iter()
        .map(|id| id.as_str())
        .enumerate()
        .map(|(idx, id)| (id, idx))
        .collect();
    tools.sort_by_key(|tool| {
        position
            .get(tool.id.as_str())
            .copied()
            .unwrap_or(usize::MAX)
    });
}

/// 把通用字段（sync_mode、effective_sync_mode、enabled、target_group_id）组装成 AgentTool。
/// builtin 与 custom 共用此逻辑，再按来源微调 source / icon_id。
#[allow(clippy::too_many_arguments)]
fn build_agent_tool(
    id: &str,
    name: &str,
    skills_path: PathBuf,
    config_path: PathBuf,
    detection_reasons: Vec<DetectionReason>,
    installed: bool,
    copy_only: bool,
    settings: &SkillManagerSettings,
) -> AgentTool {
    let sync_mode = settings
        .tool_overrides
        .get(id)
        .copied()
        .unwrap_or(ToolSyncMode::Inherit);
    let effective_sync_mode = if copy_only {
        SyncMode::Copy
    } else {
        match sync_mode {
            ToolSyncMode::Inherit => settings.default_sync_mode,
            ToolSyncMode::Symlink => SyncMode::Symlink,
            ToolSyncMode::Copy => SyncMode::Copy,
        }
    };
    let enabled = !settings.disabled_tool_ids.contains(id);
    AgentTool {
        id: id.to_string(),
        name: name.to_string(),
        installed,
        detection_reasons,
        target_group_id: target_group_id(&skills_path),
        config_path,
        skills_path,
        sync_mode,
        effective_sync_mode,
        copy_only,
        icon_id: id.to_string(),
        source: ToolSource::Builtin,
        enabled,
    }
}

impl AgentTool {
    fn with_source(mut self, source: ToolSource) -> Self {
        self.source = source;
        self
    }
    fn with_icon_id(mut self, icon_id: String) -> Self {
        self.icon_id = icon_id;
        self
    }
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
    use crate::skills::models::{
        CustomToolDefinition, DetectionReason, SkillManagerSettings, ToolSource,
    };
    use std::collections::BTreeSet;
    use std::fs;
    use std::path::PathBuf;
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

    #[test]
    fn should_default_to_enabled_builtin_tools() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".claude")).expect("claude dir should be created");

        let tools = detect_tools(home.path(), &[], &SkillManagerSettings::default());
        let claude = tools
            .iter()
            .find(|tool| tool.id == "claude-code")
            .expect("Claude should exist");

        assert!(claude.enabled);
        assert_eq!(claude.source, ToolSource::Builtin);
    }

    #[test]
    fn should_mark_disabled_tools_from_settings() {
        let home = tempdir().expect("home should be created");
        fs::create_dir_all(home.path().join(".claude")).expect("claude dir should be created");
        let mut settings = SkillManagerSettings::default();
        let mut disabled = BTreeSet::new();
        disabled.insert("claude-code".to_string());
        settings.disabled_tool_ids = disabled;

        let tools = detect_tools(home.path(), &[], &settings);
        let claude = tools
            .iter()
            .find(|tool| tool.id == "claude-code")
            .expect("Claude should exist");

        assert!(!claude.enabled);
    }

    #[test]
    fn should_detect_custom_tools_and_mark_source() {
        let home = tempdir().expect("home should be created");
        let custom_skills = home.path().join(".mytool").join("skills");
        fs::create_dir_all(&custom_skills).expect("custom skills dir should be created");
        let mut settings = SkillManagerSettings::default();
        settings.custom_tools.push(CustomToolDefinition {
            id: "custom-mytool".to_string(),
            name: "MyTool".to_string(),
            skills_path: custom_skills.clone(),
        });

        let tools = detect_tools(home.path(), &[], &settings);
        let mytool = tools
            .iter()
            .find(|tool| tool.id == "custom-mytool")
            .expect("custom tool should exist");

        assert_eq!(mytool.source, ToolSource::Custom);
        assert!(mytool.installed);
        assert_eq!(mytool.skills_path, custom_skills);
        assert_eq!(mytool.icon_id, "agents-skills");
        assert!(mytool.enabled);
    }

    #[test]
    fn should_treat_custom_tool_as_not_installed_when_parent_missing() {
        let home = tempdir().expect("home should be created");
        let mut settings = SkillManagerSettings::default();
        settings.custom_tools.push(CustomToolDefinition {
            id: "custom-gone".to_string(),
            name: "Gone".to_string(),
            skills_path: PathBuf::from("/definitely/not/here/skills"),
        });

        let tools = detect_tools(home.path(), &[], &settings);
        let gone = tools
            .iter()
            .find(|tool| tool.id == "custom-gone")
            .expect("custom tool should exist");

        assert!(!gone.installed);
    }

    #[test]
    fn should_keep_registry_order_when_tool_order_is_empty() {
        let home = tempdir().expect("home should be created");
        let settings = SkillManagerSettings::default();
        let tools = detect_tools(home.path(), &[], &settings);
        let ids: Vec<&str> = tools.iter().map(|t| t.id.as_str()).collect();

        // 空顺序时保持 registry 定义顺序：claude-code 在 codex 之前
        let claude = ids.iter().position(|id| *id == "claude-code");
        let codex = ids.iter().position(|id| *id == "codex");
        assert!(claude.unwrap() < codex.unwrap());
    }

    #[test]
    fn should_apply_custom_tool_order_and_append_unknowns() {
        let home = tempdir().expect("home should be created");
        let mut settings = SkillManagerSettings::default();
        // 自定义顺序：codex 在前，claude-code 在后
        settings.tool_order = vec!["codex".to_string(), "claude-code".to_string()];

        let tools = detect_tools(home.path(), &[], &settings);
        let ids: Vec<&str> = tools.iter().map(|t| t.id.as_str()).collect();

        // codex 应排在 claude-code 之前
        let codex_pos = ids.iter().position(|id| *id == "codex").unwrap();
        let claude_pos = ids.iter().position(|id| *id == "claude-code").unwrap();
        assert!(codex_pos < claude_pos);
        // 未列入 tool_order 的工具（如 cursor）应排在已列入的之后
        let cursor_pos = ids.iter().position(|id| *id == "cursor").unwrap();
        assert!(cursor_pos > claude_pos);
    }

    #[test]
    fn should_order_custom_tools_alongside_builtin() {
        let home = tempdir().expect("home should be created");
        let custom_skills = home.path().join(".mytool").join("skills");
        fs::create_dir_all(&custom_skills).expect("custom skills dir should be created");
        let mut settings = SkillManagerSettings::default();
        settings.custom_tools.push(CustomToolDefinition {
            id: "custom-mytool".to_string(),
            name: "MyTool".to_string(),
            skills_path: custom_skills,
        });
        // 自定义工具排到最前
        settings.tool_order = vec![
            "custom-mytool".to_string(),
            "claude-code".to_string(),
            "codex".to_string(),
        ];

        let tools = detect_tools(home.path(), &[], &settings);
        let ids: Vec<&str> = tools.iter().map(|t| t.id.as_str()).collect();
        assert_eq!(ids.first(), Some(&"custom-mytool"));
    }
}
