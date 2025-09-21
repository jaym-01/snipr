use crate::models::{self};
use crate::system::sidecar::run_side_car;
use std::time::SystemTime;
use tauri_plugin_shell::ShellExt;

pub async fn decode(
    app_handle: &tauri::AppHandle,
    input_file: &str,
) -> Result<models::AudioData, String> {
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
    .await?;

    let output_str = String::from_utf8_lossy(&raw_meta_data);

    let channels = output_str
        .lines()
        .nth(1)
        .unwrap()
        .split('=')
        .last()
        .unwrap()
        .parse::<usize>()
        .unwrap();

    let sample_rate = output_str
        .lines()
        .nth(0)
        .unwrap()
        .split('=')
        .nth(1)
        .unwrap()
        .parse::<usize>()
        .unwrap();

    let start = SystemTime::now();

    // extract the audio samples from the mp3 file
    let data: Vec<u8> = run_side_car(
        &app_handle,
        "ffmpeg",
        &["-i", input_file, "-f", "s16le", "-acodec", "pcm_s16le", "-"],
    )
    .await?;

    println!(
        "time taken {:?}",
        start.elapsed().expect("Failed to get elapsed time")
    );

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
) -> Result<(), String> {
    // run side car to convert the PCM data to the desired format
    let sidecar = app_handle
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| "Failed to write file".to_string())?
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
        .set_raw_out(true);

    let (mut rx, mut child) = sidecar.spawn().expect("Failed to spawn sidecar");

    child
        .write(&data.data)
        .map_err(|_| "Failed to write file".to_string())?;
    drop(child);

    while rx.recv().await.is_some() {}

    Ok(())
}
