mod media_processing;
mod models;
mod system;

use media_processing::{
    cut::{cancel, cut_silences},
    io::save_file,
    transcribe::transcribe,
};
use std::sync::{atomic::AtomicBool, Arc};
use system::{menu::setup_menu, update::update};
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .manage(models::CutState {
            cancelled: Arc::new(AtomicBool::new(false)),
            audio_data: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // setup_menu(&app).unwrap();

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cut_silences,
            cancel,
            save_file,
            transcribe
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
