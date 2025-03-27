// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cut;
mod io;
mod models;

fn main() {
    // snipr_lib::run()
    let old_samples =
        io::decode("C:\\Users\\jay_m\\Downloads\\LGTVG42024_VoiceOver_ORIGINAL.mp3").unwrap();

    let samples = cut::remove_silences(old_samples, None, None, None);

    io::encode(samples, "out.mp3").unwrap();
}
