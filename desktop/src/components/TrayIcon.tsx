import { useEffect } from 'react';
import { AppWindow, getCurrentWindow } from '@tauri-apps/api/window';

interface TrayIconProps {
  isListening: boolean;
  onToggle: () => void;
  onShowWindow: () => void;
}

export function TrayIcon({ isListening, onToggle, onShowWindow }: TrayIconProps) {
  // Tray icon will be set up in Tauri main.rs
  // This component is a placeholder for future tray menu functionality
  
  return null; // Tray icon is handled by Tauri system tray plugin
}

