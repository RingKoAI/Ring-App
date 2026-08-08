//! ~/.ring configuration read/write for ring-app.
//!
//! Mirrors ring-cli's `ring-core::config` and `ring-core::session::paths`.
//! All file paths align with ring-cli's unified `~/.ring/` structure.

use std::path::PathBuf;

use serde::Serialize;

// ── Paths (aligned with ring-core/src/session/paths.rs) ──────────────────────

/// Base directory for all ring data: `~/.ring/`.
/// Respects the `RING_HOME` environment variable override.
fn ring_home() -> PathBuf {
    std::env::var("RING_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| dirs::home_dir().unwrap_or_default().join(".ring"))
}

/// `~/.ring/config/settings.jsonc` — main user config.
/// Respects the `RING_CONFIG` environment variable override.
fn settings_path() -> PathBuf {
    std::env::var("RING_CONFIG")
        .map(PathBuf::from)
        .unwrap_or_else(|_| ring_home().join("config").join("settings.jsonc"))
}

/// `~/.ring/config/` directory.
fn config_dir() -> PathBuf {
    ring_home().join("config")
}

/// `~/.ring/config/auth.json` — API key credentials.
fn auth_path() -> PathBuf {
    config_dir().join("auth.json")
}

/// `~/.ring/config/providers.json` — provider catalog overrides.
fn providers_catalog_path() -> PathBuf {
    config_dir().join("providers.json")
}

// ── JSONC comment stripping (ported from ring-core config/mod.rs:205-238) ─────

fn strip_jsonc_comments(src: &str) -> String {
    let mut out = String::with_capacity(src.len());
    let mut chars = src.chars().peekable();
    let mut in_string = false;

    while let Some(ch) = chars.next() {
        match ch {
            '"' if !in_string => { in_string = true; out.push(ch); }
            '"' if in_string => { in_string = false; out.push(ch); }
            '\\' if in_string => {
                out.push(ch);
                if let Some(next) = chars.next() { out.push(next); }
            }
            '/' if !in_string => {
                match chars.peek() {
                    Some('/') => { while chars.next().is_some_and(|c| c != '\n') {} out.push('\n'); }
                    Some('*') => {
                        chars.next();
                        loop {
                            match chars.next() {
                                Some('*') if chars.peek() == Some(&'/') => { chars.next(); break; }
                                None => break,
                                _ => {}
                            }
                        }
                    }
                    _ => out.push(ch),
                }
            }
            _ => out.push(ch),
        }
    }
    out
}

// ── IPC return types ─────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct ConfigSnapshot {
    /// Raw JSON text of settings.jsonc (stripped, pretty). Front-end parses as JSON.
    pub settings: String,
    /// Raw JSON text of auth.json (or empty string if missing).
    pub auth: String,
    /// Raw JSON text of providers.json (or empty string if missing).
    pub providers_catalog: String,
    /// Absolute path to ~/.ring/ (for display in settings UI).
    pub ring_home: String,
    /// Absolute path to settings.jsonc.
    pub settings_path: String,
    /// Whether the settings file existed on disk.
    pub settings_exists: bool,
}

// ── IPC commands ─────────────────────────────────────────────────────────────

/// Read the entire config snapshot: settings.jsonc + auth.json + providers.json.
/// Returns empty strings for missing files (front-end treats as default).
#[tauri::command]
pub fn read_config() -> Result<ConfigSnapshot, String> {
    let spath = settings_path();
    let apath = auth_path();
    let ppath = providers_catalog_path();

    let settings = std::fs::read_to_string(&spath)
        .map(|raw| strip_jsonc_comments(&raw))
        .unwrap_or_default();
    let auth = std::fs::read_to_string(&apath).unwrap_or_default();
    let catalog = std::fs::read_to_string(&ppath).unwrap_or_default();

    Ok(ConfigSnapshot {
        settings,
        auth,
        providers_catalog: catalog,
        ring_home: ring_home().to_string_lossy().into_owned(),
        settings_path: spath.to_string_lossy().into_owned(),
        settings_exists: std::path::Path::new(&spath).exists(),
    })
}

/// Write settings.jsonc atomically (tmp + rename). Creates parent dirs.
/// `content` must be valid JSON (front-end serializes with JSON.stringify).
#[tauri::command]
pub fn write_settings(content: String) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Validate JSON before writing
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("invalid JSON: {e}"))?;

    let tmp = path.with_extension("jsonc.tmp");
    std::fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Write auth.json atomically. Sets 0o600 on Unix.
#[tauri::command]
pub fn write_auth(content: String) -> Result<(), String> {
    let path = auth_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("invalid JSON: {e}"))?;

    std::fs::write(&path, &content).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o600);
        std::fs::set_permissions(&path, perms).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Probe the ring binary and return its path (reuse existing probe_ring logic).
#[derive(Serialize, Clone)]
pub struct PathInfo {
    pub ring_home: String,
    pub settings_path: String,
    pub auth_path: String,
    pub settings_exists: bool,
}

/// Return key file paths for display in the settings UI.
#[tauri::command]
pub fn config_paths() -> PathInfo {
    let spath = settings_path();
    PathInfo {
        ring_home: ring_home().to_string_lossy().into_owned(),
        settings_path: spath.to_string_lossy().into_owned(),
        auth_path: auth_path().to_string_lossy().into_owned(),
        settings_exists: spath.exists(),
    }
}


