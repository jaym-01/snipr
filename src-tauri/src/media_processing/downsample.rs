use crate::media_processing::io::decode;
use crate::models::AudioData;

#[tauri::command]
pub async fn get_audio(
    app_handle: tauri::AppHandle,
    file_dest: String,
) -> Result<(Vec<f64>, Vec<f64>), String> {
    println!("get_samples called with file_dest: {}", file_dest);

    let decoded_data = decode(&app_handle, &file_dest)
        .await
        .expect("Failed to decode file");

    Ok(downsample(&decoded_data, 1000))
}

pub fn downsample(audio: &AudioData, target_samples: usize) -> (Vec<f64>, Vec<f64>) {
    // size of each window in the raw byte array
    let window_size = audio.data.len() / target_samples;

    let mut min_values = Vec::new();
    let mut max_values = Vec::new();

    audio
        .data
        .chunks(window_size)
        .enumerate()
        .for_each(|(_, chunk)| {
            // here each chunk is a window of audio data
            // values contain the 16-bit signed values for the audio samples
            let values: Vec<i16> = chunk
                .chunks_exact(2)
                .map(|c| i16::from_le_bytes([c[0], c[1]]))
                .collect();

            min_values.push(
                (values.iter().min().copied().unwrap_or_default() as f64) / 2.0_f64.powf(15.0),
            );
            max_values.push(
                (values.iter().max().copied().unwrap_or_default() as f64) / 2.0_f64.powf(15.0),
            );
        });

    (min_values, max_values)
}
