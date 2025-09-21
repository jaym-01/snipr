use crate::models::AudioData;
use pyo3::ffi::c_str;
use pyo3::prelude::*;
use pyo3::types::PyList;
use serde::Serialize;
use std::ffi::CString;

#[derive(Debug, Serialize)]
pub struct Word {
    pub text: String,
    pub start: f64,
    pub end: f64,
}

enum TranscribeModel {
    Tiny,
    Turbo,
}

impl TranscribeModel {
    fn to_str(&self) -> &str {
        match self {
            TranscribeModel::Tiny => "tiny",
            TranscribeModel::Turbo => "turbo",
        }
    }
}

fn transcribe_speech(audio: &AudioData, transcribe_model: TranscribeModel) -> PyResult<Vec<Word>> {
    let audio_true_form: Vec<f32> = audio
        .data
        .chunks_exact(2)
        .map(|chunk| {
            let num = i16::from_le_bytes([chunk[0], chunk[1]]) as f32;
            num / (2_f32.powf(15.0))
        })
        .collect();

    Ok(Python::with_gil(|py| -> PyResult<Vec<Word>> {
        let path = std::env::current_dir()
            .unwrap()
            .parent()
            .unwrap()
            .join("speech-processing")
            .join("transcribe.py");

        let code = CString::new(std::fs::read_to_string(path)?).unwrap();

        let transcribe = PyModule::from_code(
            py,
            code.as_c_str(),
            c_str!("transcribe.py"),
            c_str!("transcribe"),
        )?;

        // Convert audio data to Python list
        let audio_list = PyList::new(py, &audio_true_form)?;

        // Call the transcribe function with all required parameters
        let result = transcribe.getattr("transcribe")?.call1((
            audio_list,
            audio.sample_rate,
            audio.channels,
            transcribe_model.to_str(),
        ))?;

        // Convert Python list of words to Rust Vec<Word>
        let words = result
            .extract::<Vec<(String, f64, f64)>>()?
            .into_iter()
            .map(|(text, start, end)| Word { text, start, end })
            .collect();

        println!("words: {:?}", words);

        Ok(words)
    })
    .map_err(|e| {
        println!("Error: {}", e);
        e
    })?)
}
