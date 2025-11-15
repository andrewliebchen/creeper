# Supabase Database Migrations

This directory contains SQL migration files for the Creeper MVP database schema.

## Migration Files

1. **001_initial_schema.sql** - Creates all base tables (users, documents, document_chunks, meeting_snippets, insights)
2. **002_enable_pgvector.sql** - Enables pgvector extension and adds embedding columns with indexes

## Running Migrations

### Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001, then 002)

### Manual Application

Copy and paste the SQL from each migration file into your Supabase SQL editor and run them in order.

## Schema Overview

- **users**: User accounts
- **documents**: User documents for RAG
- **document_chunks**: Chunked document content with embeddings
- **meeting_snippets**: Audio chunk metadata and transcripts with embeddings
- **insights**: Generated insights linked to snippets

## Vector Search

The schema uses pgvector for semantic similarity search:
- Embeddings are stored as `vector(1536)` (OpenAI text-embedding-3-small dimensions)
- HNSW indexes are used for fast similarity search
- Cosine similarity is used for matching

