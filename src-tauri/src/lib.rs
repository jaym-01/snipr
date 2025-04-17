mod cut;
mod io;
mod menu;
mod models;
mod progress;
mod sidecar;
mod update;

use io::decode;
use std::sync::{
    atomic::{AtomicBool, Ordering::Relaxed},
    Arc,
};
use tokio::sync::Mutex;
use update::update;

#[tauri::command]
async fn cut_silences(
    app_handle: tauri::AppHandle,
    state: models::AppState<'_>,
    file_dest: String,
    min_sil: Option<f64>,
    padding: Option<f64>,
    threshold: Option<u16>,
) -> Result<(), String> {
    let app_state = &state;
    state.cancelled.store(false, Relaxed);

    let decoded_data = decode(&app_handle, app_state, &file_dest)
        .await
        .map_err(|_| "Failed to decode file".to_string())?;

    let audio_data = cut::remove_silences(
        app_handle,
        app_state,
        decoded_data,
        min_sil,
        padding,
        threshold,
    )?;

    if audio_data.is_none() {
        return Err("Error while removing silences".to_string());
    } else {
        let mut l_audio_data = app_state.audio_data.lock().await;
        *l_audio_data = audio_data;
        Ok(())
    }
}

#[tauri::command]
async fn cancel(state: models::AppState<'_>) -> Result<(), String> {
    state.cancelled.store(true, Relaxed);

    let mut i = 0;

    while state.cancelled.load(Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(500));
        i += 1;
        if i > 10 {
            return Err("Failed to stop process".to_string());
        }
    }

    Ok(())
}

#[tauri::command]
async fn save_file(
    app_handle: tauri::AppHandle,
    state: models::AppState<'_>,
    file_dest: String,
) -> Result<(), String> {
    let l_audio_data = state.audio_data.lock().await;
    if l_audio_data.is_none() {
        Err("No audio data to save".to_string())
    } else {
        io::encode(app_handle, l_audio_data.as_ref().unwrap(), &file_dest)
            .await
            .map_err(|_| "Failed to saved file".to_string())?;
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            crate::menu::setup_menu(&app).unwrap();

            let handle = app.handle().clone();
            println!("before spawn");
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .manage(models::CutState {
            cancelled: Arc::new(AtomicBool::new(false)),
            audio_data: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![cut_silences, cancel, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
