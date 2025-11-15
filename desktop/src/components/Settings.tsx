import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [chunkDuration, setChunkDuration] = useState(60);

  useEffect(() => {
    // Load settings from local storage or Tauri store
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await invoke('get_config');
      // TODO: Load from Tauri store or local storage
      const saved = localStorage.getItem('creeper_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chunkDuration) {
          setChunkDuration(parsed.chunkDuration);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await invoke('set_config', { key: 'chunk_duration', value: chunkDuration.toString() });
      
      // Also save to localStorage for frontend access
      localStorage.setItem('creeper_config', JSON.stringify({
        chunkDuration,
      }));
      
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <h2>Settings</h2>
        
        <div className="settings-group">
          <label>
            Chunk Duration (seconds):
            <input
              type="number"
              value={chunkDuration}
              onChange={(e) => setChunkDuration(parseInt(e.target.value, 10))}
              min="30"
              max="120"
            />
          </label>
        </div>

        <div className="settings-actions">
          <button onClick={saveSettings}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

