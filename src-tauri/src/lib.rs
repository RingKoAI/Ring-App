use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

mod config;

/// Resolve the `ring` binary path.
///
/// Priority:
/// 1. Bundled sidecar (in the app's resource directory, named `ring-<triple>`)
/// 2. System PATH (`which::which("ring")`)
fn resolve_ring_binary(app: &AppHandle) -> Result<PathBuf, String> {
    // Try sidecar in resource directory
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidates = [
            resource_dir.join("binaries").join(format!("ring-{}", target_triple())),
            resource_dir.join(format!("ring-{}", target_triple())),
        ];
        for p in &candidates {
            if p.exists() {
                return Ok(p.clone());
            }
        }
    }

    // Fall back to PATH lookup
    which::which("ring")
        .map_err(|e| format!("ring binary not found (sidecar or PATH): {e}"))
}

/// Current platform's Rust target triple (e.g. `x86_64-pc-windows-msvc`).
fn target_triple() -> &'static str {
    #[cfg(all(target_arch = "x86_64", target_os = "windows"))]
    { "x86_64-pc-windows-msvc" }
    #[cfg(all(target_arch = "x86_64", target_os = "macos"))]
    { "x86_64-apple-darwin" }
    #[cfg(all(target_arch = "aarch64", target_os = "macos"))]
    { "aarch64-apple-darwin" }
    #[cfg(all(target_arch = "x86_64", target_os = "linux"))]
    { "x86_64-unknown-linux-gnu" }
    #[cfg(all(target_arch = "aarch64", target_os = "linux"))]
    { "aarch64-unknown-linux-gnu" }
}

/// A managed subprocess. stdout is taken out and read on a background thread
/// (emitting `ring://line` events); stdin stays here for writes.
struct ManagedProcess {
    child: Child,
    stdin: Option<ChildStdin>,
    kind: String,
}

struct AppState {
    processes: Mutex<Vec<ManagedProcess>>,
}

#[derive(Serialize, Clone)]
struct ProcessInfo {
    kind: String,
    pid: u32,
    running: bool,
}

#[derive(Serialize, Clone)]
struct StdoutLine {
    pid: u32,
    kind: String,
    line: String,
}

/// Spawn `ring sdk` and stream its stdout as `ring://line` events.
#[tauri::command]
fn start_ring(app: AppHandle, state: State<'_, AppState>) -> Result<ProcessInfo, String> {
    let ring_path = resolve_ring_binary(&app)?;
    let mut child = Command::new(&ring_path)
        .arg("sdk")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("spawn ring failed: {e}"))?;

    let pid = child.id();
    let stdout = child.stdout.take();
    let stdin = child.stdin.take();

    if let Some(out) = stdout {
        let app_clone = app.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        let _ = app_clone.emit(
                            "ring://line",
                            StdoutLine { pid, kind: "ringcli".into(), line: text },
                        );
                    }
                    Err(_) => break,
                }
            }
            let _ = app_clone.emit(
                "ring://line",
                StdoutLine { pid, kind: "ringcli".into(), line: "\u{0}<exit>".into() },
            );
        });
    }

    let mut procs = state.processes.lock().map_err(|e| e.to_string())?;
    procs.push(ManagedProcess { child, stdin, kind: "ringcli".into() });

    Ok(ProcessInfo { kind: "ringcli".into(), pid, running: true })
}

/// Spawn `ringrca` as an auxiliary gateway process.
#[tauri::command]
fn start_ringrca(state: State<'_, AppState>) -> Result<ProcessInfo, String> {
    let child = Command::new("ringrca")
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("spawn ringrca failed: {e}"))?;

    let pid = child.id();
    let mut procs = state.processes.lock().map_err(|e| e.to_string())?;
    procs.push(ManagedProcess { child, stdin: None, kind: "ringrca".into() });

    Ok(ProcessInfo { kind: "ringrca".into(), pid, running: true })
}

#[tauri::command]
fn list_processes(state: State<'_, AppState>) -> Result<Vec<ProcessInfo>, String> {
    let mut procs = state.processes.lock().map_err(|e| e.to_string())?;
    Ok(procs
        .iter_mut()
        .filter_map(|p| {
            let running = match p.child.try_wait() {
                Ok(Some(_)) => false,
                _ => true,
            };
            Some(ProcessInfo { kind: p.kind.clone(), pid: p.child.id(), running })
        })
        .collect())
}

/// Write a single line to the process stdin. Non-blocking, fire-and-forget.
#[tauri::command]
fn ring_send(state: State<'_, AppState>, pid: u32, text: String) -> Result<(), String> {
    let mut procs = state.processes.lock().map_err(|e| e.to_string())?;
    let p = procs.iter_mut().find(|p| p.child.id() == pid).ok_or("process not found")?;
    let stdin = p.stdin.as_mut().ok_or("no stdin")?;
    writeln!(stdin, "{text}").map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn stop_process(state: State<'_, AppState>, pid: u32) -> Result<(), String> {
    let mut procs = state.processes.lock().map_err(|e| e.to_string())?;
    if let Some(idx) = procs.iter().position(|p| p.child.id() == pid) {
        let mut p = procs.remove(idx);
        let _ = p.child.kill();
        let _ = p.child.wait();
    }
    Ok(())
}

/// Probe whether the `ring` binary is available (sidecar or PATH).
#[derive(Serialize)]
struct ProbeResult {
    found: bool,
    path: Option<String>,
    source: Option<String>,
    error: Option<String>,
}

#[tauri::command]
fn probe_ring(app: AppHandle) -> ProbeResult {
    match resolve_ring_binary(&app) {
        Ok(p) => {
            let is_sidecar = p.to_string_lossy().contains("binaries");
            ProbeResult {
                found: true,
                path: Some(p.to_string_lossy().into_owned()),
                source: Some(if is_sidecar { "sidecar" } else { "path" }.into()),
                error: None,
            }
        }
        Err(e) => ProbeResult { found: false, path: None, source: None, error: Some(e) },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { processes: Mutex::new(Vec::new()) })
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::include_image!("icons/128x128.png");
                window.set_icon(icon)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_ring,
            start_ringrca,
            list_processes,
            stop_process,
            ring_send,
            probe_ring,
            config::read_config,
            config::write_settings,
            config::write_auth,
            config::config_paths,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
