use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, UNIX_EPOCH};
use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri_plugin_global_shortcut::{
    Builder as ShortcutBuilder, GlobalShortcutExt, Shortcut, ShortcutState,
};

mod webdav;

const MAIN_WINDOW_LABEL: &str = "main";
const QUICK_SEARCH_LABEL: &str = "quick-search";
const DEFAULT_QUICK_SEARCH_SHORTCUT: &str = "CommandOrControl+Shift+Space";
const SHOW_MENU_ID: &str = "show";
#[cfg(target_os = "macos")]
const MACOS_ANSI_V_KEYCODE: u16 = 9;

// 粘贴编排时序（毫秒）：隐藏浮窗后等待目标应用恢复焦点 + 光标就位
#[cfg(target_os = "macos")]
const FOCUS_DELAY_MS: u64 = 200;
#[cfg(not(target_os = "macos"))]
const FOCUS_DELAY_MS: u64 = 150;
const QUIT_MENU_ID: &str = "quit";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceFileEntry {
    name: String,
    path: String,
    size: u64,
    modified_at: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuickSearchPasteOutcome {
    pasted: bool,
}

#[derive(Default)]
struct QuickSearchFocusState {
    previous_app_bundle_id: Mutex<Option<String>>,
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

#[derive(Debug, PartialEq, Eq)]
enum QuickSearchToggleAction {
    Show,
    Hide,
}

#[derive(Debug, PartialEq, Eq)]
enum QuickSearchAppVisibilityAction {
    KeepUnchanged,
}

#[derive(Debug, PartialEq, Eq)]
enum QuickSearchPasteVisibilityAction {
    HideApp,
    HideWindow,
}

#[derive(Debug, PartialEq, Eq)]
enum PastePermissionAction {
    Continue,
    Reject,
}

/// 根据浮窗当前可见性决定 toggle 后的动作（纯函数，便于单测）。
fn quick_search_toggle_action(is_visible: bool) -> QuickSearchToggleAction {
    if is_visible {
        QuickSearchToggleAction::Hide
    } else {
        QuickSearchToggleAction::Show
    }
}

/// 快速搜索是独立浮窗，显示/隐藏时不应改变整个应用的可见性。
fn quick_search_app_visibility_action() -> QuickSearchAppVisibilityAction {
    QuickSearchAppVisibilityAction::KeepUnchanged
}

/// 粘贴时 macOS 需要隐藏整个应用，才能把焦点交还给唤出浮窗前的目标应用。
fn quick_search_paste_visibility_action(is_macos: bool) -> QuickSearchPasteVisibilityAction {
    if is_macos {
        QuickSearchPasteVisibilityAction::HideApp
    } else {
        QuickSearchPasteVisibilityAction::HideWindow
    }
}

fn should_hide_main_for_quick_search(previous_app_is_current_app: bool) -> bool {
    !previous_app_is_current_app
}

fn paste_permission_action(is_macos: bool, is_trusted: bool) -> PastePermissionAction {
    if is_macos && !is_trusted {
        PastePermissionAction::Reject
    } else {
        PastePermissionAction::Continue
    }
}

fn is_paste_permission_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        unsafe { objc2_application_services::AXIsProcessTrusted() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

fn ensure_paste_permission() -> Result<(), String> {
    match paste_permission_action(cfg!(target_os = "macos"), is_paste_permission_granted()) {
        PastePermissionAction::Continue => Ok(()),
        PastePermissionAction::Reject => {
            Err("macOS Accessibility permission is required for auto paste".to_string())
        }
    }
}

fn is_safe_bundle_identifier(bundle_id: &str) -> bool {
    !bundle_id.is_empty()
        && bundle_id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
}

#[cfg(target_os = "macos")]
fn get_frontmost_app_bundle_id() -> Option<String> {
    let output = std::process::Command::new("osascript")
        .args([
            "-e",
            "tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let bundle_id = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if is_safe_bundle_identifier(&bundle_id) {
        Some(bundle_id)
    } else {
        None
    }
}

#[cfg(not(target_os = "macos"))]
fn get_frontmost_app_bundle_id() -> Option<String> {
    None
}

fn remember_frontmost_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(bundle_id) = get_frontmost_app_bundle_id() {
        let state = app.state::<QuickSearchFocusState>();
        let lock_result = state.previous_app_bundle_id.lock();
        if let Ok(mut previous_app_bundle_id) = lock_result {
            *previous_app_bundle_id = Some(bundle_id);
        }
    }
}

#[cfg(target_os = "macos")]
fn activate_app_by_bundle_id(bundle_id: &str) -> Result<(), String> {
    if !is_safe_bundle_identifier(bundle_id) {
        return Err("Invalid app bundle identifier".to_string());
    }

    let script = format!("tell application id \"{}\" to activate", bundle_id);
    let status = std::process::Command::new("osascript")
        .args(["-e", script.as_str()])
        .status()
        .map_err(|error| error.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to activate previous app".to_string())
    }
}

#[cfg(not(target_os = "macos"))]
fn activate_app_by_bundle_id(_bundle_id: &str) -> Result<(), String> {
    Ok(())
}

/// 激活本应用自身到前台（用于快速搜索"打开详情"切回主窗口）。
///
/// 在主线程内直接调用 AppKit——进程内、即时、不阻塞。刻意不沿用
/// `activate_app_by_bundle_id`（osascript）：它会向自身发送 Apple Event，
/// 同步等待响应时易与主线程死锁（这正是同步命令下的卡死根因），且 dev 模式下
/// 二进制未注册 bundle id 时还会失败。同步 Tauri 命令恰在主线程执行，满足
/// NSApplication 的主线程要求；activateIgnoringOtherApps(true) 强制置前。
#[cfg(target_os = "macos")]
#[allow(deprecated)] // activateIgnoringOtherApps 仍是最可靠的强制激活方式
fn activate_this_app() {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSApplication;
    if let Some(mtm) = MainThreadMarker::new() {
        let app = NSApplication::sharedApplication(mtm);
        app.activateIgnoringOtherApps(true);
    }
}

#[cfg(not(target_os = "macos"))]
fn activate_this_app() {}

fn activate_previous_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let bundle_id = app
        .state::<QuickSearchFocusState>()
        .previous_app_bundle_id
        .lock()
        .ok()
        .and_then(|previous_app_bundle_id| previous_app_bundle_id.clone());

    if let Some(bundle_id) = bundle_id {
        let _ = activate_app_by_bundle_id(&bundle_id);
    }
}

fn previous_app_is_current_app<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> bool {
    app.state::<QuickSearchFocusState>()
        .previous_app_bundle_id
        .lock()
        .ok()
        .and_then(|previous_app_bundle_id| previous_app_bundle_id.clone())
        .is_some_and(|bundle_id| bundle_id == app.config().identifier)
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

/// 把主窗口带到前台：显示 + 取消最小化 + 聚焦窗口，并激活整个应用。
///
/// 单纯 `window.show/set_focus` 无法把一个未在前台的应用拉到最前——macOS 上
/// 快速搜索浮窗常由用户从其他应用呼出，此时 PromptClip 自身并不在前台，
/// 主窗口即便 show 也会被其他应用遮挡。因此需要显式激活应用本身。
/// 用于快速搜索"打开详情"等从浮窗切回主窗口的场景。
fn bring_main_window_to_front<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    activate_this_app();
}

fn hide_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

/// 计算窗口在指定显示器中的居中坐标。
fn centered_window_position(
    monitor_position: (i32, i32),
    monitor_size: (u32, u32),
    window_size: (u32, u32),
) -> (i32, i32) {
    let x =
        i64::from(monitor_position.0) + (i64::from(monitor_size.0) - i64::from(window_size.0)) / 2;
    let y =
        i64::from(monitor_position.1) + (i64::from(monitor_size.1) - i64::from(window_size.1)) / 2;
    (x as i32, y as i32)
}

/// 将快速搜索窗口移动到鼠标所在显示器中央。
fn reposition_quick_search_window<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> Result<(), String> {
    let cursor_monitor = window.cursor_position().ok().and_then(|position| {
        window
            .monitor_from_point(position.x, position.y)
            .ok()
            .flatten()
    });
    let monitor = cursor_monitor
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "No monitor is available for quick search".to_string())?;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size().map_err(|error| error.to_string())?;
    let (x, y) = centered_window_position(
        (monitor_position.x, monitor_position.y),
        (monitor_size.width, monitor_size.height),
        (window_size.width, window_size.height),
    );

    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

fn prepare_quick_search_show<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    window: &tauri::WebviewWindow<R>,
) -> bool {
    remember_frontmost_app(app);
    if let Err(error) = reposition_quick_search_window(window) {
        eprintln!("Failed to reposition quick search window: {error}");
    }
    let should_hide_main = should_hide_main_for_quick_search(previous_app_is_current_app(app));
    if should_hide_main {
        hide_main_window(app);
    }
    should_hide_main
}

/// 切换快速搜索浮窗的显示/隐藏。
fn toggle_quick_search<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(QUICK_SEARCH_LABEL) {
        let is_visible = window.is_visible().unwrap_or(false);
        match quick_search_toggle_action(is_visible) {
            QuickSearchToggleAction::Show => {
                let should_hide_main = prepare_quick_search_show(app, &window);
                match quick_search_app_visibility_action() {
                    QuickSearchAppVisibilityAction::KeepUnchanged => {}
                }
                let _ = window.show();
                let _ = window.set_focus();
                if should_hide_main {
                    hide_main_window(app);
                }
            }
            QuickSearchToggleAction::Hide => {
                let _ = window.hide();
            }
        }
    }
}

fn show_quick_search_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(QUICK_SEARCH_LABEL) {
        let should_hide_main = prepare_quick_search_show(app, &window);
        match quick_search_app_visibility_action() {
            QuickSearchAppVisibilityAction::KeepUnchanged => {}
        }
        let _ = window.show();
        let _ = window.set_focus();
        if should_hide_main {
            hide_main_window(app);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        app_lifecycle_action, centered_window_position, is_safe_bundle_identifier,
        paste_permission_action, quick_search_app_visibility_action,
        quick_search_paste_visibility_action, quick_search_toggle_action,
        should_hide_main_for_quick_search, window_lifecycle_action, AppLifecycleAction,
        AppLifecycleEvent, PastePermissionAction, QuickSearchAppVisibilityAction,
        QuickSearchPasteVisibilityAction, QuickSearchToggleAction, WindowLifecycleAction,
        WindowLifecycleEvent,
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

    #[test]
    fn should_show_quick_search_when_not_visible() {
        assert_eq!(
            quick_search_toggle_action(false),
            QuickSearchToggleAction::Show
        );
    }

    #[test]
    fn should_hide_quick_search_when_visible() {
        assert_eq!(
            quick_search_toggle_action(true),
            QuickSearchToggleAction::Hide
        );
    }

    #[test]
    fn should_keep_app_visibility_unchanged_for_quick_search() {
        assert_eq!(
            quick_search_app_visibility_action(),
            QuickSearchAppVisibilityAction::KeepUnchanged
        );
    }

    #[test]
    fn should_hide_app_before_pasting_on_macos() {
        assert_eq!(
            quick_search_paste_visibility_action(true),
            QuickSearchPasteVisibilityAction::HideApp
        );
    }

    #[test]
    fn should_hide_only_quick_search_before_pasting_on_non_macos() {
        assert_eq!(
            quick_search_paste_visibility_action(false),
            QuickSearchPasteVisibilityAction::HideWindow
        );
    }

    #[test]
    fn should_hide_main_when_quick_search_starts_from_another_app() {
        assert!(should_hide_main_for_quick_search(false));
    }

    #[test]
    fn should_keep_main_when_quick_search_starts_from_current_app() {
        assert!(!should_hide_main_for_quick_search(true));
    }

    #[test]
    fn should_center_quick_search_on_primary_monitor() {
        assert_eq!(
            centered_window_position((0, 0), (1920, 1080), (640, 392)),
            (640, 344)
        );
    }

    #[test]
    fn should_center_quick_search_on_monitor_with_negative_coordinates() {
        assert_eq!(
            centered_window_position((-2560, 0), (2560, 1440), (640, 392)),
            (-1600, 524)
        );
    }

    #[test]
    fn should_accept_safe_bundle_identifiers() {
        assert!(is_safe_bundle_identifier("com.apple.TextEdit"));
        assert!(is_safe_bundle_identifier("com.google.Chrome"));
        assert!(is_safe_bundle_identifier("com.example.my-app"));
    }

    #[test]
    fn should_reject_unsafe_bundle_identifiers() {
        assert!(!is_safe_bundle_identifier(""));
        assert!(!is_safe_bundle_identifier("com.example.App\""));
        assert!(!is_safe_bundle_identifier("com.example.App;open"));
        assert!(!is_safe_bundle_identifier("com.example.App 中文"));
    }

    #[test]
    fn should_reject_paste_when_macos_accessibility_is_not_trusted() {
        assert_eq!(
            paste_permission_action(true, false),
            PastePermissionAction::Reject
        );
    }

    #[test]
    fn should_allow_paste_when_macos_accessibility_is_trusted() {
        assert_eq!(
            paste_permission_action(true, true),
            PastePermissionAction::Continue
        );
    }

    #[test]
    fn should_allow_paste_on_non_macos_without_accessibility_check() {
        assert_eq!(
            paste_permission_action(false, false),
            PastePermissionAction::Continue
        );
    }

    #[test]
    fn should_allow_dialog_messages_for_the_main_window() {
        let capability = include_str!("../capabilities/default.json");

        assert!(capability.contains("\"dialog:allow-message\""));
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

#[tauri::command]
fn show_quick_search(app: tauri::AppHandle) -> Result<(), String> {
    show_quick_search_window(&app);
    Ok(())
}

#[tauri::command]
fn hide_quick_search(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(QUICK_SEARCH_LABEL) {
        let _ = window.hide();
    }
    Ok(())
}

/// 显示并把主窗口带到前台（含激活整个应用）。
///
/// 供快速搜索浮窗"打开详情"等场景调用：浮窗与主窗口是隔离的 JS 上下文，
/// 主窗口收到 open-detail 事件后通过本命令把自身唤醒到前台。
#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    bring_main_window_to_front(&app);
    Ok(())
}

/// 重新注册快速搜索的全局快捷键（先全部取消再注册新的）。
/// 快捷键字符串真相源在前端 settingsStore，本命令只负责注册动作。
#[tauri::command]
fn set_quick_search_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    let parsed = shortcut
        .parse::<Shortcut>()
        .map_err(|error| error.to_string())?;
    let global_shortcut = app.global_shortcut();
    let _ = global_shortcut.unregister_all();
    global_shortcut
        .register(parsed)
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn unset_quick_search_shortcut(app: tauri::AppHandle) -> Result<(), String> {
    let _ = app.global_shortcut().unregister_all();
    Ok(())
}

/// 用 enigo 模拟“粘贴”按键组合（mac: Cmd+V，其它平台: Ctrl+V）。
fn paste_via_enigo() -> Result<(), String> {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;
    #[cfg(target_os = "macos")]
    let paste_key = Key::Other(MACOS_ANSI_V_KEYCODE.into());
    #[cfg(not(target_os = "macos"))]
    let paste_key = Key::Unicode('v');
    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| e.to_string())?;
    enigo
        .key(paste_key, Direction::Click)
        .map_err(|e| e.to_string())?;
    enigo
        .key(modifier, Direction::Release)
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn paste_shortcut_safely() -> Result<(), String> {
    std::panic::catch_unwind(paste_via_enigo)
        .map_err(|_| "Native paste shortcut failed unexpectedly".to_string())?
}

fn hide_for_quick_search_paste<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    match quick_search_paste_visibility_action(cfg!(target_os = "macos")) {
        QuickSearchPasteVisibilityAction::HideApp => {
            #[cfg(target_os = "macos")]
            {
                let _ = app.hide();
            }
        }
        QuickSearchPasteVisibilityAction::HideWindow => {
            if let Some(window) = app.get_webview_window(QUICK_SEARCH_LABEL) {
                let _ = window.hide();
            }
        }
    }
}

/// 把 content 复制到剪贴板，并尽量粘贴到上一个前台应用的光标处。
///
/// 编排：写入正文到剪贴板 → 隐藏 PromptClip（让目标应用恢复焦点）→ 权限检查 →
/// 等待焦点切换 → 模拟 Cmd/Ctrl+V。即使自动粘贴权限不可用，正文也会保留在剪贴板。
#[tauri::command]
async fn quick_search_paste(
    app: tauri::AppHandle,
    content: String,
) -> Result<QuickSearchPasteOutcome, String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(&content).map_err(|e| e.to_string())?;
    drop(clipboard);

    hide_for_quick_search_paste(&app);
    activate_previous_app(&app);

    if ensure_paste_permission().is_err() {
        return Ok(QuickSearchPasteOutcome { pasted: false });
    }

    tokio::time::sleep(Duration::from_millis(FOCUS_DELAY_MS)).await;
    if paste_shortcut_safely().is_err() {
        return Ok(QuickSearchPasteOutcome { pasted: false });
    }

    Ok(QuickSearchPasteOutcome { pasted: true })
}

/// 检测当前进程是否拥有向其它应用发送按键所需的权限（macOS 无障碍）。
#[tauri::command]
fn check_paste_permission() -> bool {
    is_paste_permission_granted()
}

/// 打开系统无障碍设置面板（macOS），引导用户授权。
#[tauri::command]
fn open_accessibility_settings() {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let is_quitting = Arc::new(AtomicBool::new(false));
    let close_is_quitting = Arc::clone(&is_quitting);
    let menu_is_quitting = Arc::clone(&is_quitting);

    tauri::Builder::default()
        .manage(QuickSearchFocusState::default())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // fs must be registered before persisted-scope so selected paths can be restored.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            ShortcutBuilder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_quick_search(app);
                    }
                })
                .build(),
        )
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

            // 注册默认全局快捷键（呼出/隐藏快速搜索浮窗）。
            // 真正的快捷键由前端 settingsStore 持有，启动后前端会调用
            // set_quick_search_shortcut 覆盖为用户配置；这里先注册默认值，
            // 保证主窗口未就绪时快捷键也能用。
            if let Ok(shortcut) = DEFAULT_QUICK_SEARCH_SHORTCUT.parse::<Shortcut>() {
                let _ = app.global_shortcut().register(shortcut);
            }

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
            show_quick_search,
            hide_quick_search,
            focus_main_window,
            set_quick_search_shortcut,
            unset_quick_search_shortcut,
            quick_search_paste,
            check_paste_permission,
            open_accessibility_settings,
            webdav::webdav_delete,
            webdav::webdav_delete_password,
            webdav::webdav_list,
            webdav::webdav_move,
            webdav::webdav_read,
            webdav::webdav_store_password,
            webdav::webdav_test_connection,
            webdav::webdav_write,
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
