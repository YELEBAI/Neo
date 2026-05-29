use std::sync::{Arc, Mutex};

use actix_files::Files;
use actix_web::{web, App, HttpResponse, HttpServer};
use serde_json::Value;

use crate::AppStore;

/// Start the LAN HTTP server.
pub async fn start(
    addr: String,
    port: u16,
    store: Arc<Mutex<AppStore>>,
    store_path: String,
    frontend_dir: String,
) -> std::io::Result<()> {
    let state = web::Data::new(ServerState {
        store: store.clone(),
    });
    let store_path_data = web::Data::new(store_path);

    HttpServer::new(move || {
        let frontend = frontend_dir.clone();
        App::new()
            .app_data(state.clone())
            .app_data(store_path_data.clone())
            // ── REST API ────────────────────────────
            .service(
                web::scope("/api")
                    .route("/store/{key}", web::get().to(get_store))
                    .route("/store/{key}", web::put().to(set_store))
                    .route("/store/{key}", web::delete().to(delete_store))
                    .route("/store", web::get().to(list_store)),
            )
            // ── SPA (React Router) ──────────────────
            // .index_file("index.html") serves index.html for any path
            // that doesn't match a physical file — exactly what React Router needs.
            .service(Files::new("/", &frontend).index_file("index.html"))
    })
    .bind((addr.as_str(), port))?
    .run()
    .await
}

struct ServerState {
    store: Arc<Mutex<AppStore>>,
}

// ── Handlers ───────────────────────────────────────────

async fn get_store(
    state: web::Data<ServerState>,
    key: web::Path<String>,
) -> HttpResponse {
    let store = state.store.lock().unwrap();
    match store.get(&key.into_inner()) {
        Some(v) => HttpResponse::Ok().json(serde_json::json!({ "value": v })),
        None => HttpResponse::NotFound().json(serde_json::json!({ "error": "not found" })),
    }
}

async fn set_store(
    state: web::Data<ServerState>,
    store_path: web::Data<String>,
    key: web::Path<String>,
    body: web::Json<Value>,
) -> HttpResponse {
    let mut store = state.store.lock().unwrap();
    let value = body.get("value").and_then(|v| v.as_str()).unwrap_or("");
    store.insert(key.into_inner(), value.to_string());

    let raw = serde_json::to_string_pretty(&*store).unwrap();
    let _ = std::fs::write(store_path.get_ref(), raw);
    HttpResponse::Ok().json(serde_json::json!({ "ok": true }))
}

async fn delete_store(
    state: web::Data<ServerState>,
    store_path: web::Data<String>,
    key: web::Path<String>,
) -> HttpResponse {
    let mut store = state.store.lock().unwrap();
    store.remove(&key.into_inner());

    let raw = serde_json::to_string_pretty(&*store).unwrap();
    let _ = std::fs::write(store_path.get_ref(), raw);
    HttpResponse::Ok().json(serde_json::json!({ "ok": true }))
}

async fn list_store(state: web::Data<ServerState>) -> HttpResponse {
    let store = state.store.lock().unwrap();
    let entries: Vec<_> = store.iter().map(|(k, v)| (k.clone(), v.clone())).collect();
    HttpResponse::Ok().json(entries)
}
