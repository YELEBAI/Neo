pub mod server;

use std::{
    collections::BTreeMap,
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::Manager;

pub type AppStore = BTreeMap<String, String>;

fn app_store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("Failed to resolve app data directory: {err}"))?;
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Failed to create app data directory: {err}"))?;
    Ok(dir.join("store.json"))
}

fn read_app_store(app: &tauri::AppHandle) -> Result<AppStore, String> {
    let path = app_store_path(app)?;
    if !path.exists() {
        return Ok(AppStore::new());
    }
    let raw = fs::read_to_string(&path)
        .map_err(|err| format!("Failed to read app store: {err}"))?;
    if raw.trim().is_empty() {
        return Ok(AppStore::new());
    }
    serde_json::from_str(&raw).map_err(|err| format!("Failed to parse app store: {err}"))
}

fn write_app_store(app: &tauri::AppHandle, store: &AppStore) -> Result<(), String> {
    let path = app_store_path(app)?;
    write_store_to_path(store, &path)
}

fn write_store_to_path(store: &AppStore, path: &PathBuf) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(store)
        .map_err(|err| format!("Failed to serialize app store: {err}"))?;
    fs::write(path, raw).map_err(|err| format!("Failed to write app store: {err}"))
}

// ── Tauri commands ─────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to NeoTavern Demo.", name)
}

#[tauri::command]
fn app_store_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let store = read_app_store(&app)?;
    Ok(store.get(&key).cloned())
}

#[tauri::command]
fn app_store_set(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let mut store = read_app_store(&app)?;
    store.insert(key, value);
    write_app_store(&app, &store)
}

#[tauri::command]
fn app_store_remove(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let mut store = read_app_store(&app)?;
    store.remove(&key);
    write_app_store(&app, &store)
}

#[tauri::command]
fn app_store_entries(app: tauri::AppHandle) -> Result<AppStore, String> {
    read_app_store(&app)
}

// ── LAN server commands ────────────────────────────────

#[tauri::command]
fn lan_server_status(app: tauri::AppHandle) -> Result<String, String> {
    let store = read_app_store(&app)?;
    let enabled = store
        .get("neotavern_lan_enabled")
        .map(|v| v == "true")
        .unwrap_or(false);
    let addr = store
        .get("neotavern_lan_addr")
        .cloned()
        .unwrap_or_else(|| "0.0.0.0".into());
    let port = store
        .get("neotavern_lan_port")
        .cloned()
        .unwrap_or_else(|| "3000".into());

    if enabled {
        Ok(format!("Running on {addr}:{port}"))
    } else {
        Ok("Disabled".into())
    }
}

fn try_start_lan_server(handle: tauri::AppHandle) {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut store = read_app_store(&handle).unwrap_or_default();
            let enabled = store
                .get("neotavern_lan_enabled")
                .map(|v| v == "true")
                .unwrap_or(false);
            if !enabled {
                return;
            }

            let addr = store
                .get("neotavern_lan_addr")
                .cloned()
                .unwrap_or_else(|| "0.0.0.0".into());
            let port: u16 = store
                .get("neotavern_lan_port")
                .and_then(|v| v.parse().ok())
                .unwrap_or(3000);

            let store_path = app_store_path(&handle)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            // Generate and persist LAN password on first launch
            if !store.contains_key("neotavern_lan_password") {
                let pw = random_password();
                store.insert("neotavern_lan_password".into(), pw);
                let _ = write_store_to_path(&store, &std::path::PathBuf::from(&store_path));
            }

            let frontend_dir = resolve_frontend_dir(&handle);
            let shared_store: Arc<Mutex<AppStore>> = Arc::new(Mutex::new(store));

            if let Err(e) =
                crate::server::start(addr, port, shared_store, store_path, frontend_dir).await
            {
                eprintln!("LAN server failed: {e}");
            }
        });
    });
}

fn random_password() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let chars: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
    let mut pw = String::with_capacity(12);
    for i in 0..12 {
        let idx = ((seed >> (i * 4)) ^ (seed >> (i * 4 + 16))) as usize % chars.len();
        pw.push(chars[idx] as char);
    }
    pw
}

fn resolve_frontend_dir(_handle: &tauri::AppHandle) -> String {
    // The exe is in the install dir; dist/ is bundled as frontend/ alongside it
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let frontend = dir.join("frontend");
            if frontend.join("index.html").exists() {
                return frontend.to_string_lossy().to_string();
            }
            // Fallback: flat files (NSIS may have flattened)
            if dir.join("index.html").exists() {
                return dir.to_string_lossy().to_string();
            }
        }
    }
    // Dev fallback: project's dist/
    std::env::current_dir()
        .map(|p| p.join("apps/desktop/dist").to_string_lossy().to_string())
        .unwrap_or_else(|_| "apps/desktop/dist".into())
}

// ── App entry ──────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            app_store_get,
            app_store_set,
            app_store_remove,
            app_store_entries,
            lan_server_status,
        ])
        .setup(|app| {
            try_start_lan_server(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
