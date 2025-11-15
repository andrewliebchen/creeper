// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::collections::HashMap;
use std::sync::Mutex;
use commands::*;

fn main() {
    let config_state: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        // TODO: Add system tray icon in a future update
        // For now, we'll keep it simple to get the app building
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide window instead of closing when user clicks X
                _window.hide().unwrap();
                api.prevent_close();
            }
        })
        .manage(config_state)
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            request_mic_permission,
            validate_audio_chunk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
