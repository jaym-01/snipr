use super::io::cancel_cleanup;
use super::progress::send_progress;
use crate::models::{self, AppState, AudioData};

const GENERIC_CUT_ERROR: &str = "Failed to cut samples";

pub fn remove_silences(
    app_handle: tauri::AppHandle,
    state: &AppState<'_>,
    data: models::AudioData,
    min_sil: Option<f64>,
    padding: Option<f64>,
    threshold: Option<u16>,
) -> Result<Option<models::AudioData>, String> {
    // min number of samples before it can be considered a silence
    // take into account the 2 bytes for each sample and number of channels
    let buffer_size =
        (data.sample_rate as f64 * min_sil.unwrap_or(0.25) * 2.0 * data.channels as f64) as i64;

    let padding_ =
        (padding.unwrap_or(0.1) * data.sample_rate as f64 * 2.0 * data.channels as f64) as i64;
    let threshold_ = threshold.unwrap_or(400);

    let mut i: usize = 0;
    let mut start = -1;

    let mut new_samples: Vec<u8> = Vec::new();

    // this is the base number for updating the progress bar
    let increment = data.data.len() / 6;
    let mut cur_increment = 0;

    while i <= data.data.len() - (data.channels as usize * 2) {
        // find max amp of all channels
        let mut max_amp = 0;
        for j in 0..(data.channels as usize) {
            // offset by 2 bytes
            let index = i + j * 2;
            max_amp = max_amp.max(
                i16::from_le_bytes([
                    *data.data.get(index).ok_or(GENERIC_CUT_ERROR)?,
                    *data.data.get(index + 1).ok_or(GENERIC_CUT_ERROR)?,
                ])
                .unsigned_abs(),
            );
        }

        // add samples the final samples array
        for j in 0..(data.channels as usize) {
            // offset by 2 bytes
            let index = i + j * 2;
            new_samples.push(*data.data.get(index).ok_or(GENERIC_CUT_ERROR)?);
            new_samples.push(*data.data.get(index + 1).ok_or(GENERIC_CUT_ERROR)?);
        }

        // index moves the current next sample - start of the next iteration
        i += (data.channels * 2) as usize;

        // check if the process has started
        if start >= 0 && new_samples.len() as i64 >= start + buffer_size {
            // check if at end of silence
            // or at the end of the audio file
            if max_amp > threshold_ || i == data.data.len() as usize {
                // perform cut
                let begin = (start + padding_) as usize;
                let end = new_samples.len() - padding_ as usize;

                new_samples.splice(begin..end, []);
                start = -1;
            }
        } else {
            if max_amp > threshold_ {
                // found a sample that is too big
                // reset the start to search again
                start = -1;
            } else if start < 0 {
                // found a possible silence
                start = new_samples.len() as i64;
            }
        }

        if i % 50 == 0 {
            if state.cancelled.load(std::sync::atomic::Ordering::Relaxed) {
                cancel_cleanup(state);
                return Ok(Option::None);
            }
        }

        if i >= cur_increment * increment {
            cur_increment += 1;
            send_progress(&app_handle, (cur_increment * 10 + 30) as u64);
        }
    }

    return Ok(Option::Some(AudioData {
        channels: data.channels,
        sample_rate: data.sample_rate,
        data: new_samples,
    }));
}
