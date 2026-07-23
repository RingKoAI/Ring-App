use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

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
    let mut child = Command::new("ring")
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

/// Probe whether the `ring` binary is on PATH.
#[derive(Serialize)]
struct ProbeResult {
    found: bool,
    path: Option<String>,
    error: Option<String>,
}

#[tauri::command]
fn probe_ring() -> ProbeResult {
    match which::which("ring") {
        Ok(p) => ProbeResult { found: true, path: Some(p.to_string_lossy().into_owned()), error: None },
        Err(e) => ProbeResult { found: false, path: None, error: Some(e.to_string()) },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { processes: Mutex::new(Vec::new()) })
        .invoke_handler(tauri::generate_handler![
            start_ring,
            start_ringrca,
            list_processes,
            stop_process,
            ring_send,
            probe_ring,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
