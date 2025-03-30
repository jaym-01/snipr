mod cut;
mod io;
mod models;

use io::decode;
use std::sync::{
    atomic::{AtomicBool, Ordering::Relaxed},
    Arc, Mutex,
};

#[tauri::command]
async fn cut_silences(state: models::AppState<'_>, file_dest: String) -> Result<(), String> {
    let app_state = &state;
    state.cancelled.store(false, Relaxed);

    let decoded_data =
        decode(app_state, &file_dest).map_err(|_| "Failed to decode file".to_string())?;

    let audio_data = cut::remove_silences(app_state, decoded_data, None, None, None);

    if audio_data.is_none() {
        return Err("Error while removing silences".to_string());
    } else {
        let mut l_audio_data = app_state.audio_data.lock().unwrap();
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
async fn save_file(state: models::AppState<'_>, file_dest: String) -> Result<(), String> {
    let l_audio_data = state.audio_data.lock().unwrap();
    if l_audio_data.is_none() {
        Err("No audio data to save".to_string())
    } else {
        io::encode(l_audio_data.as_ref().unwrap(), &file_dest)
            .map_err(|_| "Failed to saved file".to_string())?;
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
