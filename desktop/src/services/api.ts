import type {
  IngestAudioChunkResponse,
  InsightResponse,
  CreateSessionResponse,
  ListSessionsResponse,
  GetSessionResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  ResumeSessionResponse,
} from '@creeper/shared';

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

export async function createSession(
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<CreateSessionResponse> {
  const response = await fetch(`${backendUrl}/sessions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function endSession(
  sessionId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<void> {
  const response = await fetch(`${backendUrl}/sessions/${sessionId}/end`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
}

export async function uploadAudioChunk(
  audioBlob: Blob,
  timestamp: number,
  duration: number,
  sessionId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<IngestAudioChunkResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('timestamp', timestamp.toString());
  formData.append('duration', duration.toString());
  formData.append('format', 'webm');
  formData.append('sessionId', sessionId);

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

export async function getSessionInsight(
  sessionId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<InsightResponse> {
  const response = await fetch(`${backendUrl}/insight/for-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId,
    }),
  });

  // 202 (Accepted) means we're waiting for transcripts - this is expected, not an error
  if (response.status === 202) {
    const data = await response.json().catch(() => ({ status: 'waiting' }));
    const error: any = new Error(data.message || 'Waiting for transcripts...');
    error.status = 202;
    error.response = response;
    throw error;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    const err: any = new Error(error.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.response = response;
    throw err;
  }

  return response.json();
}

export async function listSessions(
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<ListSessionsResponse> {
  const response = await fetch(`${backendUrl}/sessions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getSession(
  sessionId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<GetSessionResponse> {
  const response = await fetch(`${backendUrl}/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function resumeSession(
  sessionId: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<ResumeSessionResponse> {
  const response = await fetch(`${backendUrl}/sessions/${sessionId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateDocument(
  sessionId: string,
  content: string,
  backendUrl: string = DEFAULT_BACKEND_URL
): Promise<UpdateDocumentResponse> {
  const response = await fetch(`${backendUrl}/sessions/${sessionId}/document`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content } as UpdateDocumentRequest),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

