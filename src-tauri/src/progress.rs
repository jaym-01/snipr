use tauri::Emitter;

pub fn send_progress(app_handle: &tauri::AppHandle, p: u64) {
    app_handle.emit("cut-progress", p).unwrap();
}
