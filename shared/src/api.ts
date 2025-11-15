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

// Insight generation
export interface InsightRequest {
  snippetId: string;
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

