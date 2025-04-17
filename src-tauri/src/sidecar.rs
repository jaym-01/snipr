use tauri_plugin_shell::{process::CommandEvent, ShellExt};

pub async fn run_side_car(
    app_handle: &tauri::AppHandle,
    program: &str,
    args: &[&str],
) -> Result<Vec<u8>, String> {
    let sidecar = app_handle
        .shell()
        .sidecar(program)
        .map_err(|_| "Failed read/write file".to_string())?
        .args(args)
        .set_raw_out(true);

    let (mut rx, _) = sidecar.spawn().expect("Failed to spawn sidecar");
    let mut raw_data: Vec<u8> = Vec::new();

    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(bytes) = event {
            raw_data.extend_from_slice(&bytes);
        }
    }

    return Ok(raw_data);
}
