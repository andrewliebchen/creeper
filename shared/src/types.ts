// Shared types for Creeper MVP

export interface AudioChunk {
  id: string;
  timestamp: number;
  duration: number; // in seconds
  data: Uint8Array | string; // base64 encoded or raw bytes
  format: 'wav' | 'mp3' | 'm4a';
}

export interface Transcript {
  id: string;
  snippetId: string;
  text: string;
  language?: string;
  confidence?: number;
  createdAt: string;
}

export interface MeetingSession {
  id: string;
  userId: string;
  name?: string; // LLM-generated session name
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingSnippet {
  id: string;
  userId: string;
  sessionId?: string; // Link to meeting session
  timestamp: number;
  duration: number;
  transcript?: string;
  transcriptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  sessionId: string; // Changed from snippetId to sessionId
  snippetId?: string; // Kept for backward compatibility
  bullets: string[]; // 1-3 bullet points (legacy, for display)
  content?: string; // Full insight document that gets updated incrementally
  context?: string; // RAG context used
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  chunks: DocumentChunk[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[]; // vector embedding
  chunkIndex: number;
  createdAt: string;
}

export interface User {
  id: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  openaiApiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  backendUrl?: string;
  chunkDuration?: number; // in seconds, default 60
}

