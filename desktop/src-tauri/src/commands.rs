use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioChunkData {
    pub data: String, // base64 encoded audio
    pub timestamp: i64,
    pub duration: u32, // in seconds
    pub format: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub chunk_duration: u32, // in seconds, default 60
}

type ConfigState = Mutex<HashMap<String, String>>;

// Get current configuration
#[tauri::command]
pub fn get_config(state: State<ConfigState>) -> Result<Config, String> {
    let config = state.lock().unwrap();
    let chunk_duration = config
        .get("chunk_duration")
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(60);
    
    Ok(Config { chunk_duration })
}

// Set configuration
#[tauri::command]
pub fn set_config(
    key: String,
    value: String,
    state: State<ConfigState>,
) -> Result<(), String> {
    let mut config = state.lock().unwrap();
    config.insert(key, value);
    Ok(())
}

// Request microphone permissions (macOS)
#[tauri::command]
pub async fn request_mic_permission() -> Result<bool, String> {
    // On macOS, permissions are typically handled by the system
    // when the app tries to access the microphone
    // This is a placeholder - actual permission handling will be done
    // through Info.plist and system prompts
    Ok(true)
}

// Validate audio chunk data
#[tauri::command]
pub fn validate_audio_chunk(chunk: AudioChunkData) -> Result<bool, String> {
    if chunk.data.is_empty() {
        return Err("Audio data is empty".to_string());
    }
    if chunk.duration == 0 {
        return Err("Duration must be greater than 0".to_string());
    }
    if chunk.format.is_empty() {
        return Err("Format must be specified".to_string());
    }
    Ok(true)
}

