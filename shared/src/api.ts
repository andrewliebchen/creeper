// API request/response types

import { AudioChunk, Transcript, Insight, Document, MeetingSnippet } from './types';

// Audio ingestion
export interface IngestAudioChunkRequest {
  audio: File | Blob;
  timestamp: number;
  duration: number;
  format?: string;
}

export interface IngestAudioChunkResponse {
  snippetId: string;
  status: 'received' | 'processing' | 'completed';
}

// Session management
export interface CreateSessionRequest {
  userId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
}

// Insight generation (now session-based)
export interface InsightRequest {
  sessionId: string; // Changed from snippetId
  snippetId?: string; // Optional, for backward compatibility
  transcript?: string;
}

export interface InsightResponse {
  insight: Insight;
  relevantDocs?: Document[];
}

// Document search
export interface DocumentSearchRequest {
  query: string;
  limit?: number;
  userId?: string;
}

export interface DocumentSearchResponse {
  chunks: Array<{
    id: string;
    documentId: string;
    content: string;
    similarity: number;
    documentTitle: string;
  }>;
}

// Health check
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services?: {
    database?: 'ok' | 'error';
    openai?: 'ok' | 'error';
  };
}

// Session list and detail
export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt?: string;
  documentPreview?: string; // First line of document
  lastUpdated: string;
  isActive: boolean; // ended_at IS NULL
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface GetSessionResponse {
  session: {
    id: string;
    userId: string;
    startedAt: string;
    endedAt?: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };
  document: {
    id: string;
    content: string;
    bullets: string[];
    createdAt: string;
    updatedAt: string;
    userEditedAt?: string;
  } | null;
}

// Document update
export interface UpdateDocumentRequest {
  content: string;
}

export interface UpdateDocumentResponse {
  status: 'ok';
  document: {
    id: string;
    content: string;
    updatedAt: string;
    userEditedAt: string;
  };
}

// Resume session
export interface ResumeSessionResponse {
  status: 'ok';
  sessionId: string;
  message: string;
}

