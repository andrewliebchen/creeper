import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AudioCaptureState {
  isListening: boolean;
  error: string | null;
  chunkCount: number;
}

interface UseAudioCaptureOptions {
  chunkDuration?: number; // in seconds, default 60
  backendUrl?: string;
  onChunkReady?: (chunk: Blob, timestamp: number) => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}) {
  const { chunkDuration = 60, backendUrl, onChunkReady } = options;
  
  const [state, setState] = useState<AudioCaptureState>({
    isListening: false,
    error: null,
    chunkCount: 0,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Request microphone permission
  const requestPermission = useCallback(async () => {
    try {
      await invoke('request_mic_permission');
      return true;
    } catch (error) {
      console.error('Failed to request mic permission:', error);
      return false;
    }
  }, []);

  // Start audio capture
  const startListening = useCallback(async () => {
    try {
      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();

      // Handle data available (chunk ready)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onChunkReady) {
          const timestamp = Date.now();
          onChunkReady(event.data, timestamp);
          setState((prev) => ({
            ...prev,
            chunkCount: prev.chunkCount + 1,
          }));
        }
      };

      // Start recording
      mediaRecorder.start();

      // Set up chunking interval
      if (chunkIntervalRef.current !== null) {
        clearInterval(chunkIntervalRef.current);
      }
      chunkIntervalRef.current = window.setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // Stop current chunk and start new one
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, chunkDuration * 1000);

      setState({
        isListening: true,
        error: null,
        chunkCount: 0,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isListening: false,
        error: errorMessage,
        chunkCount: 0,
      });
    }
  }, [chunkDuration, onChunkReady, requestPermission]);

  // Stop audio capture
  const stopListening = useCallback(() => {
    // Clear interval
    if (chunkIntervalRef.current !== null) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    startTimeRef.current = null;

    setState((prev) => ({
      ...prev,
      isListening: false,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    requestPermission,
  };
}

