-- Enable pgvector extension for vector similarity search
-- This migration enables the vector extension and adds embedding columns

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks for RAG
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI text-embedding-3-small uses 1536 dimensions

-- Add embedding column to meeting_snippets for transcript similarity
ALTER TABLE meeting_snippets 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create vector similarity indexes using HNSW (Hierarchical Navigable Small World)
-- HNSW is faster for similarity search than IVFFlat for larger datasets
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_meeting_snippets_embedding 
ON meeting_snippets 
USING hnsw (embedding vector_cosine_ops);

-- Note: If HNSW is not available, fallback to IVFFlat:
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
-- ON document_chunks 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

