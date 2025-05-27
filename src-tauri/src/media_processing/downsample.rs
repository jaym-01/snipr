use crate::media_processing::io::decode;
use crate::models::{AppState, AudioData};

#[tauri::command]
pub async fn get_samples(
    app_handle: tauri::AppHandle,
    state: AppState<'_>,
    file_dest: String,
) -> Result<Vec<i16>, String> {
    println!("get_samples called with file_dest: {}", file_dest);

    let decoded_data = decode(&app_handle, &state, &file_dest)
        .await
        .expect("Failed to decode file");

    let samples = form_samples(&decoded_data);

    println!("Done!");

    Ok(samples)
}

pub fn form_samples(audio: &AudioData) -> Vec<i16> {
    audio
        .data
        .chunks(2)
        .map(|chunk| {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
            sample
        })
        .collect()
}

// pub fn downsample(audio: &AudioData, target_samples: usize) -> Vec<Vec<(i16, i16)>> {
//     let channel_len: usize = audio.data.len() / (2 * audio.channels);
//     let window_size: usize = channel_len / target_samples;

//     let mut downsampled: Vec<Vec<(i16, i16)>> = vec![vec![]; audio.channels];

//     for i in 0..target_samples {}
// }
