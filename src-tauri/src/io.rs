use crate::models::{self, AppState};
use crate::sidecar::run_side_car;
use std::fs::{remove_file, File};
use std::io::{BufWriter, Write};
use std::path::Path;

pub const TMP_PCM_PATH: &str = "temp.pcm";

pub fn cancel_cleanup(state: &AppState<'_>) {
    if Path::new(TMP_PCM_PATH).exists() {
        std::fs::remove_file(TMP_PCM_PATH).unwrap();
    }

    state
        .cancelled
        .store(false, std::sync::atomic::Ordering::Relaxed);
}

pub async fn decode(
    app_handle: tauri::AppHandle,
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

    let output_str = String::from_utf8_lossy(&raw_meta_data);

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

    // extract the audio samples from the mp3 file
    let data: Vec<u8> = run_side_car(
        &app_handle,
        "ffmpeg",
        &["-i", input_file, "-f", "s16le", "-acodec", "pcm_s16le", "-"],
    )
    .await;

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
    // Create a temporary file to store PCM data
    let pcm_file = File::create(TMP_PCM_PATH)?;
    let mut writer = BufWriter::new(pcm_file);

    // Write the PCM data to the file
    for &sample in data.data.iter() {
        writer.write_all(&sample.to_le_bytes())?;
    }

    writer.flush()?;

    // write the data to a file specified
    run_side_car(
        &app_handle,
        "ffmpeg",
        &[
            "-y",
            "-f",
            "s16le",
            "-ar",
            &data.sample_rate.to_string(),
            "-ac",
            &data.channels.to_string(),
            "-i",
            TMP_PCM_PATH,
            path,
        ],
    )
    .await;

    // remove the PCM file made
    remove_file(TMP_PCM_PATH)?;

    Ok(())
}
