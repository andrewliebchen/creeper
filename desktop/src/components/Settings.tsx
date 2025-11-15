import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3000');
  const [chunkDuration, setChunkDuration] = useState(60);

  useEffect(() => {
    // Load settings from local storage or Tauri store
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await invoke('get_config');
      // TODO: Load from Tauri store or local storage
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await invoke('set_config', { key: 'openai_api_key', value: openaiKey });
      await invoke('set_config', { key: 'supabase_url', value: supabaseUrl });
      await invoke('set_config', { key: 'supabase_key', value: supabaseKey });
      await invoke('set_config', { key: 'backend_url', value: backendUrl });
      await invoke('set_config', { key: 'chunk_duration', value: chunkDuration.toString() });
      
      // Also save to localStorage for frontend access
      localStorage.setItem('creeper_config', JSON.stringify({
        openaiKey,
        supabaseUrl,
        supabaseKey,
        backendUrl,
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
            OpenAI API Key:
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>
        </div>

        <div className="settings-group">
          <label>
            Supabase URL:
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="settings-group">
          <label>
            Supabase Key:
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="..."
            />
          </label>
        </div>

        <div className="settings-group">
          <label>
            Backend URL:
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </label>
        </div>

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

