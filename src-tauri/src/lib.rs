use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::UNIX_EPOCH;
use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const MAIN_WINDOW_LABEL: &str = "main";
const SHOW_MENU_ID: &str = "show";
const QUIT_MENU_ID: &str = "quit";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceFileEntry {
    name: String,
    path: String,
    size: u64,
    modified_at: u128,
}

fn workspace_root(root: &str) -> Result<PathBuf, String> {
    let root_path = PathBuf::from(root);

    if !root_path.is_absolute() {
        return Err("工作区路径不合法".to_string());
    }

    Ok(root_path)
}

fn safe_relative_path(path: &str) -> Result<PathBuf, String> {
    let path = Path::new(path);

    if path.as_os_str().is_empty() || path.is_absolute() {
        return Err("文件路径不合法".to_string());
    }

    let mut safe_path = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => safe_path.push(part),
            Component::CurDir => {}
            _ => return Err("文件路径不合法".to_string()),
        }
    }

    if safe_path.as_os_str().is_empty() {
        return Err("文件路径不合法".to_string());
    }

    Ok(safe_path)
}

fn workspace_path(root: &str, path: &str) -> Result<PathBuf, String> {
    let root_path = workspace_root(root)?;
    Ok(root_path.join(safe_relative_path(path)?))
}

fn modified_at_millis(metadata: &fs::Metadata) -> u128 {
    metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[derive(Debug, PartialEq, Eq)]
enum WindowLifecycleAction {
    Continue,
    ExitApplication,
    HideToTray,
}

#[derive(Debug, PartialEq, Eq)]
enum AppLifecycleAction {
    Continue,
    ShowMainWindow,
}

#[derive(Debug, PartialEq, Eq)]
enum WindowLifecycleEvent {
    CloseRequested,
    Other,
}

#[derive(Debug, PartialEq, Eq)]
enum AppLifecycleEvent {
    Reopen,
    Other,
}

fn window_lifecycle_event(event: &tauri::WindowEvent) -> WindowLifecycleEvent {
    match event {
        tauri::WindowEvent::CloseRequested { .. } => WindowLifecycleEvent::CloseRequested,
        _ => WindowLifecycleEvent::Other,
    }
}

fn app_lifecycle_event(event: &tauri::RunEvent) -> AppLifecycleEvent {
    match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { .. } => AppLifecycleEvent::Reopen,
        _ => AppLifecycleEvent::Other,
    }
}

fn window_lifecycle_action(
    event: WindowLifecycleEvent,
    is_quitting: bool,
) -> WindowLifecycleAction {
    match (event, is_quitting) {
        (WindowLifecycleEvent::CloseRequested, false) => WindowLifecycleAction::HideToTray,
        (WindowLifecycleEvent::CloseRequested, true) => WindowLifecycleAction::ExitApplication,
        (WindowLifecycleEvent::Other, _) => WindowLifecycleAction::Continue,
    }
}

fn app_lifecycle_action(event: AppLifecycleEvent) -> AppLifecycleAction {
    match event {
        AppLifecycleEvent::Reopen => AppLifecycleAction::ShowMainWindow,
        AppLifecycleEvent::Other => AppLifecycleAction::Continue,
    }
}

fn show_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::{
        app_lifecycle_action, window_lifecycle_action, AppLifecycleAction, AppLifecycleEvent,
        WindowLifecycleAction, WindowLifecycleEvent,
    };

    #[test]
    fn should_hide_to_tray_when_window_close_is_requested() {
        assert_eq!(
            window_lifecycle_action(WindowLifecycleEvent::CloseRequested, false),
            WindowLifecycleAction::HideToTray
        );
    }

    #[test]
    fn should_exit_application_when_quitting_is_requested() {
        assert_eq!(
            window_lifecycle_action(WindowLifecycleEvent::CloseRequested, true),
            WindowLifecycleAction::ExitApplication
        );
    }

    #[test]
    fn should_continue_for_other_window_events() {
        assert_eq!(
            window_lifecycle_action(WindowLifecycleEvent::Other, false),
            WindowLifecycleAction::Continue
        );
    }

    #[test]
    fn should_show_main_window_when_app_reopens() {
        assert_eq!(
            app_lifecycle_action(AppLifecycleEvent::Reopen),
            AppLifecycleAction::ShowMainWindow
        );
    }
}

fn file_entry(
    root: &Path,
    relative_path: &Path,
    native_path: &Path,
) -> Result<WorkspaceFileEntry, String> {
    let metadata = fs::metadata(native_path).map_err(|error| error.to_string())?;
    let normalized_path = relative_path.to_string_lossy().replace('\\', "/");
    let name = relative_path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| normalized_path.clone());

    if !native_path.starts_with(root) {
        return Err("文件路径不合法".to_string());
    }

    Ok(WorkspaceFileEntry {
        name,
        path: normalized_path,
        size: metadata.len(),
        modified_at: modified_at_millis(&metadata),
    })
}

fn collect_files(
    root: &Path,
    native_directory: &Path,
    relative_directory: &Path,
    extensions: &[String],
    include_hidden_directories: bool,
    files: &mut Vec<WorkspaceFileEntry>,
) -> Result<(), String> {
    for entry in fs::read_dir(native_directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let file_name = entry.file_name();
        let relative_path = relative_directory.join(&file_name);
        let file_type = entry.file_type().map_err(|error| error.to_string())?;

        if file_type.is_dir() {
            if include_hidden_directories || !file_name.to_string_lossy().starts_with('.') {
                collect_files(
                    root,
                    &entry.path(),
                    &relative_path,
                    extensions,
                    include_hidden_directories,
                    files,
                )?;
            }
            continue;
        }

        if file_type.is_file() {
            let lower_path = relative_path.to_string_lossy().to_lowercase();
            if extensions
                .iter()
                .any(|extension| lower_path.ends_with(extension))
            {
                files.push(file_entry(root, &relative_path, &entry.path())?);
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn workspace_root_exists(root: String) -> Result<bool, String> {
    Ok(workspace_root(&root)?.exists())
}

#[tauri::command]
fn workspace_exists(root: String, path: String) -> Result<bool, String> {
    Ok(workspace_path(&root, &path)?.exists())
}

#[tauri::command]
fn workspace_read_text(root: String, path: String) -> Result<String, String> {
    fs::read_to_string(workspace_path(&root, &path)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn workspace_read_binary(root: String, path: String) -> Result<Vec<u8>, String> {
    fs::read(workspace_path(&root, &path)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn workspace_write_text(
    root: String,
    path: String,
    content: String,
) -> Result<WorkspaceFileEntry, String> {
    let root_path = workspace_root(&root)?;
    let relative_path = safe_relative_path(&path)?;
    let native_path = root_path.join(&relative_path);

    if let Some(parent) = native_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(&native_path, content).map_err(|error| error.to_string())?;
    file_entry(&root_path, &relative_path, &native_path)
}

#[tauri::command]
fn workspace_write_binary(
    root: String,
    path: String,
    content: Vec<u8>,
) -> Result<WorkspaceFileEntry, String> {
    let root_path = workspace_root(&root)?;
    let relative_path = safe_relative_path(&path)?;
    let native_path = root_path.join(&relative_path);

    if let Some(parent) = native_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::write(&native_path, content).map_err(|error| error.to_string())?;
    file_entry(&root_path, &relative_path, &native_path)
}

#[tauri::command]
fn workspace_list_files(
    root: String,
    extensions: Vec<String>,
    include_hidden_directories: bool,
) -> Result<Vec<WorkspaceFileEntry>, String> {
    let root_path = workspace_root(&root)?;
    let normalized_extensions = extensions
        .into_iter()
        .map(|extension| extension.to_lowercase())
        .collect::<Vec<_>>();
    let mut files = Vec::new();

    collect_files(
        &root_path,
        &root_path,
        Path::new(""),
        &normalized_extensions,
        include_hidden_directories,
        &mut files,
    )?;

    Ok(files)
}

#[tauri::command]
fn workspace_move(root: String, from: String, to: String) -> Result<(), String> {
    let source = workspace_path(&root, &from)?;
    let target = workspace_path(&root, &to)?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    fs::rename(source, target).map_err(|error| error.to_string())
}

#[tauri::command]
fn workspace_mkdir(root: String, path: String) -> Result<(), String> {
    fs::create_dir_all(workspace_path(&root, &path)?).map_err(|error| error.to_string())
}

#[tauri::command]
fn workspace_remove(root: String, path: String) -> Result<(), String> {
    let native_path = workspace_path(&root, &path)?;

    if native_path.is_dir() {
        fs::remove_dir_all(native_path).map_err(|error| error.to_string())
    } else {
        fs::remove_file(native_path).map_err(|error| error.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let is_quitting = Arc::new(AtomicBool::new(false));
    let close_is_quitting = Arc::clone(&is_quitting);
    let menu_is_quitting = Arc::clone(&is_quitting);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // fs must be registered before persisted-scope so selected paths can be restored.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let menu = MenuBuilder::new(app)
                .text(SHOW_MENU_ID, "显示")
                .text(QUIT_MENU_ID, "退出")
                .build()?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("PromptClip")
                .menu(&menu)
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }

            tray.build(app)?;
            Ok(())
        })
        .on_menu_event(move |app, event| match event.id().as_ref() {
            SHOW_MENU_ID => show_main_window(app),
            QUIT_MENU_ID => {
                menu_is_quitting.store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|app, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => show_main_window(app),
            _ => {}
        })
        .on_window_event(move |window, event| {
            let action = window_lifecycle_action(
                window_lifecycle_event(event),
                close_is_quitting.load(Ordering::SeqCst),
            );
            match action {
                WindowLifecycleAction::HideToTray => {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                    }
                    let _ = window.hide();
                }
                WindowLifecycleAction::ExitApplication => {
                    window.app_handle().exit(0);
                }
                WindowLifecycleAction::Continue => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            workspace_root_exists,
            workspace_exists,
            workspace_read_text,
            workspace_read_binary,
            workspace_write_text,
            workspace_write_binary,
            workspace_list_files,
            workspace_move,
            workspace_mkdir,
            workspace_remove,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if app_lifecycle_action(app_lifecycle_event(&event))
                == AppLifecycleAction::ShowMainWindow
            {
                show_main_window(app);
            }
        });
}
