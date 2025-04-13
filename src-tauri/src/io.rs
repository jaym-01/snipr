use crate::models::{self, AppState};
use crate::progress::send_progress;
use crate::sidecar::{self, run_side_car};
use tauri_plugin_shell::ShellExt;

pub fn cancel_cleanup(state: &AppState<'_>) {
    state
        .cancelled
        .store(false, std::sync::atomic::Ordering::Relaxed);
}

pub async fn decode(
    app_handle: &tauri::AppHandle,
    state: &AppState<'_>,
    input_file: &str,
) -> Result<models::AudioData, std::io::Error> {
    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    send_progress(&app_handle, 5);

    // get meta data - the channels + sample rate
    let raw_meta_data = run_side_car(
        &app_handle,
        "ffprobe",
        &[
            "-v",
            "error",
            "-show_entries",
            "stream=channels,sample_rate",
            "-of",
            "default=noprint_wrappers=1",
            input_file,
        ],
    )
    .await;

    send_progress(&app_handle, 10);

    let output_str = String::from_utf8_lossy(&raw_meta_data);

    println!("Output: {}", output_str);

    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    let channels = output_str
        .lines()
        .nth(1)
        .unwrap()
        .split('=')
        .last()
        .unwrap()
        .parse::<u8>()
        .unwrap();

    let sample_rate = output_str
        .lines()
        .nth(0)
        .unwrap()
        .split('=')
        .nth(1)
        .unwrap()
        .parse::<u32>()
        .unwrap();

    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    send_progress(&app_handle, 15);

    // extract the audio samples from the mp3 file
    let data: Vec<u8> = run_side_car(
        &app_handle,
        "ffmpeg",
        &["-i", input_file, "-f", "s16le", "-acodec", "pcm_s16le", "-"],
    )
    .await;

    send_progress(&app_handle, 30);

    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    Ok(models::AudioData {
        channels: channels,
        sample_rate: sample_rate,
        data: data,
    })
}

pub async fn encode(
    app_handle: tauri::AppHandle,
    data: &models::AudioData,
    path: &str,
) -> Result<(), std::io::Error> {
    // run side car to convert the PCM data to the desired format
    let sidecar = app_handle
        .shell()
        .sidecar("ffmpeg")
        .unwrap()
        .args([
            "-y",
            "-f",
            "s16le",
            "-ar",
            &data.sample_rate.to_string(),
            "-ac",
            &data.channels.to_string(),
            "-i",
            "-",
            path,
        ])
        // .env("PATH", sidecar::get_dll_path(&app_handle))
        .set_raw_out(true);

    let (mut rx, mut child) = sidecar.spawn().expect("Failed to spawn sidecar");

    child.write(&data.data).unwrap();
    drop(child);

    while rx.recv().await.is_some() {}

    Ok(())
}
