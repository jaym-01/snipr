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
    println!("starting");
    println!("starting cut_silences {}", file_dest);

    let app_state = &state;
    state.cancelled.store(false, Relaxed);

    let audio_data = cut::remove_silences(
        app_state,
        decode(app_state, &file_dest).unwrap(),
        None,
        None,
        None,
    );

    if audio_data.is_none() {
        return Err("Error while cutting silences".to_string());
    } else {
        let mut l_audio_data = app_state.audio_data.lock().unwrap();
        *l_audio_data = audio_data;
        Ok(())
    }
}

#[tauri::command]
async fn cancel(state: models::AppState<'_>) -> Result<(), String> {
    state.cancelled.store(true, Relaxed);
    Ok(())
}

#[tauri::command]
async fn save_file(state: models::AppState<'_>, file_dest: String) -> Result<(), String> {
    println!("starting save_file {}", file_dest);
    let l_audio_data = state.audio_data.lock().unwrap();
    if l_audio_data.is_none() {
        Err("Error while saving file".to_string())
    } else {
        io::encode(l_audio_data.as_ref().unwrap(), &file_dest);
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
