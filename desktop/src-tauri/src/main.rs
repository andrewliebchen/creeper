// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, CustomMenuItem};
use commands::*;

fn main() {
    let config_state: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
    
    // Create system tray menu
    let toggle = CustomMenuItem::new("toggle".to_string(), "Start Listening");
    let show = CustomMenuItem::new("show".to_string(), "Show Window");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(toggle)
        .add_item(show)
        .add_item(quit);
    
    let system_tray = SystemTray::new().with_menu(tray_menu);
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::LeftClick { .. } => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "toggle" => {
                            // Toggle listening - this will be handled by frontend
                            // For now, just show window
                            let window = app.get_window("main").unwrap();
                            window.show().unwrap();
                        }
                        "show" => {
                            let window = app.get_window("main").unwrap();
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                }
                _ => {}
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
