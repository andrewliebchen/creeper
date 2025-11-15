import type { IngestAudioChunkResponse, InsightResponse } from '@creeper/shared';

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function uploadAudioChunk(
  audioBlob: Blob,
  timestamp: number,
  duration: number,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<IngestAudioChunkResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('timestamp', timestamp.toString());
  formData.append('duration', duration.toString());
  formData.append('format', 'webm');

  const response = await fetch(`${backendUrl}/ingest/audio-chunk`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getInsight(
  snippetId: string,
  transcript?: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<InsightResponse> {
  const response = await fetch(`${backendUrl}/insight/for-chunk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippetId,
      transcript,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

