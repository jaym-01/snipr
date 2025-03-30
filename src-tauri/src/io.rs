use crate::models::{self, AppState};
use std::fs::{remove_file, File};
use std::io::{BufWriter, Write};
use std::path::Path;
use std::process::{Command, Stdio};

pub const TMP_PCM_PATH: &str = "temp.pcm";

pub fn cancel_cleanup(state: &AppState<'_>) {
    if Path::new(TMP_PCM_PATH).exists() {
        std::fs::remove_file(TMP_PCM_PATH).unwrap();
    }

    state
        .cancelled
        .store(false, std::sync::atomic::Ordering::Relaxed);
}

pub fn decode(state: &AppState<'_>, input_file: &str) -> Result<models::AudioData, std::io::Error> {
    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }
    // get meta data - the channels + sample rate
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("stream=channels,sample_rate")
        .arg("-of")
        .arg("default=noprint_wrappers=1")
        .arg(input_file)
        .stdout(Stdio::piped()) // Capture stdout
        .stderr(Stdio::null()) // Ignore stderr
        .output()?;

    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);

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

    // extract the audio samples from the data
    let ffmpeg_out = Command::new("ffmpeg")
        .args(&["-i", input_file, "-f", "s16le", "-acodec", "pcm_s16le", "-"])
        .output()?;

    if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
        cancel_cleanup(state);
        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Operation cancelled",
        ));
    }

    let data = ffmpeg_out.stdout;

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

pub fn encode(data: &models::AudioData, path: &str) -> Result<(), std::io::Error> {
    // Create a temporary file to store PCM data
    let pcm_file = File::create(TMP_PCM_PATH)?;
    let mut writer = BufWriter::new(pcm_file);

    // Write the PCM data to the file
    for &sample in data.data.iter() {
        writer.write_all(&sample.to_le_bytes())?;
    }

    writer.flush()?;

    // Construct the FFmpeg command
    let mut mp3_write = Command::new("ffmpeg")
        .arg("-y")
        .arg("-f")
        .arg("s16le")
        .arg("-ar")
        .arg(data.sample_rate.to_string())
        .arg("-ac")
        .arg(data.channels.to_string())
        .arg("-i")
        .arg(TMP_PCM_PATH)
        .arg(path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;

    mp3_write.wait()?;

    remove_file(TMP_PCM_PATH)?;

    Ok(())
}
