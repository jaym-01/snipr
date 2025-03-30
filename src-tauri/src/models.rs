use std::sync::{atomic::AtomicBool, Arc, Mutex};

use tauri::State;

pub type AppState<'a> = State<'a, CutState>;

pub struct CutState {
    pub cancelled: Arc<AtomicBool>,
    pub audio_data: Arc<Mutex<Option<AudioData>>>,
}

pub struct AudioData {
    pub channels: u8,
    pub sample_rate: u32,
    pub data: Vec<u8>,
}
