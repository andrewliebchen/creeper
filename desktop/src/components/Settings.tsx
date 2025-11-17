import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Creeper settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chunk-duration">Chunk Duration (seconds)</Label>
            <Input
              id="chunk-duration"
              type="number"
              value={chunkDuration}
              onChange={(e) => setChunkDuration(parseInt(e.target.value, 10))}
              min="30"
              max="120"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSettings}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

