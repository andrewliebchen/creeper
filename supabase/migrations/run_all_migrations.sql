-- Creeper MVP - Run All Migrations
-- Run this in Supabase SQL Editor

-- ============================================
-- Migration 001: Initial Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (for RAG)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document chunks table (for vector search)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Meeting snippets table (audio chunks metadata and transcripts)
CREATE TABLE IF NOT EXISTS meeting_snippets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
    duration INTEGER NOT NULL, -- Duration in seconds
    transcript TEXT, -- Transcribed text (no audio storage)
    transcript_id UUID, -- Reference to transcript record if needed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snippet_id UUID NOT NULL REFERENCES meeting_snippets(id) ON DELETE CASCADE,
    bullets TEXT[] NOT NULL, -- Array of 1-3 bullet points
    context TEXT, -- RAG context used for generation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_snippets_user_id ON meeting_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_snippets_created_at ON meeting_snippets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_snippet_id ON insights(snippet_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_snippets_updated_at BEFORE UPDATE ON meeting_snippets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration 002: Enable pgvector
-- ============================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks for RAG
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI text-embedding-3-small uses 1536 dimensions

-- Add embedding column to meeting_snippets for transcript similarity
ALTER TABLE meeting_snippets 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector similarity indexes using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_meeting_snippets_embedding 
ON meeting_snippets 
USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- Migration 003: Vector Search Functions
-- ============================================

-- Create RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title AS document_title
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    dc.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR d.user_id = user_id_filter)
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create similar function for meeting snippets if needed
CREATE OR REPLACE FUNCTION match_meeting_snippets(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  transcript text,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.transcript,
    1 - (ms.embedding <=> query_embedding) AS similarity,
    ms.created_at
  FROM meeting_snippets ms
  WHERE
    ms.embedding IS NOT NULL
    AND (user_id_filter IS NULL OR ms.user_id = user_id_filter)
    AND (1 - (ms.embedding <=> query_embedding)) >= match_threshold
  ORDER BY ms.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Migration 004: Session-based insights
-- ============================================

-- Create meeting_sessions table
CREATE TABLE IF NOT EXISTS meeting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add session_id to meeting_snippets
ALTER TABLE meeting_snippets 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES meeting_sessions(id) ON DELETE SET NULL;

-- Update insights table to reference session instead of snippet
-- First, make snippet_id nullable (since insights are now session-based)
ALTER TABLE insights 
ALTER COLUMN snippet_id DROP NOT NULL;

-- Add session_id column
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES meeting_sessions(id) ON DELETE CASCADE;

-- Make insights updatable (add updated_at)
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Change bullets to be a single TEXT field for the full insight document
-- We'll keep bullets as array for now but add content field for the full insight
ALTER TABLE insights 
ADD COLUMN IF NOT EXISTS content TEXT; -- Full insight document that gets updated

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_user_id ON meeting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_started_at ON meeting_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_snippets_session_id ON meeting_snippets(session_id);
CREATE INDEX IF NOT EXISTS idx_insights_session_id ON insights(session_id);

-- Trigger for insights updated_at
CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for meeting_sessions updated_at
CREATE TRIGGER update_meeting_sessions_updated_at BEFORE UPDATE ON meeting_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

