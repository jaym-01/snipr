// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cut;
mod io;
mod models;

fn main() {
    snipr_lib::run()
}
