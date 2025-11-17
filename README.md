# Creeper - Meeting Copilot MVP

A lightweight macOS desktop app that listens during calls, transcribes audio chunks, and provides real-time insights using OpenAI and RAG via Supabase.

## Overview

Creeper captures audio from your microphone in 60-second chunks, transcribes them using OpenAI's Whisper API, generates embeddings for semantic search, and provides real-time insights during meetings. It uses RAG (Retrieval-Augmented Generation) to surface relevant context from your documents.

## Tech Stack

- **Desktop**: Tauri + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + TypeScript + Express
- **Database**: Supabase (Postgres + pgvector)
- **AI**: OpenAI (Whisper, embeddings, GPT-4o-mini)

## Project Structure

```
creeper/
├── desktop/              # Tauri desktop app
├── backend/              # Express API server
├── shared/               # Shared TypeScript types
├── supabase/             # Database migrations
└── scripts/              # Test scripts for each chunk
```

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Cargo (for Tauri)
- Supabase account
- OpenAI API key

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your keys
   ```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run migrations in order:
     ```bash
     # In Supabase SQL Editor, run:
     # 1. supabase/migrations/001_initial_schema.sql
     # 2. supabase/migrations/002_enable_pgvector.sql
     # 3. supabase/migrations/003_vector_search_function.sql
     ```

4. **Build shared types:**
   ```bash
   cd shared && pnpm build
   ```

### Development

**Start backend:**
```bash
cd backend
pnpm dev
```

**Start desktop app:**
```bash
cd desktop
pnpm tauri:dev
```

## Testing

Each chunk has a test script to verify structure:

```bash
pnpm test:chunk-1   # Monorepo foundation
pnpm test:chunk-2   # Tauri desktop skeleton
pnpm test:chunk-3   # Backend API skeleton
# ... etc
pnpm test:integration  # Full system test
```

## Features

- ✅ Audio capture with configurable chunk duration (default 60s)
- ✅ OpenAI Whisper transcription
- ✅ Embedding generation and vector storage
- ✅ Real-time insight generation (1-3 bullets)
- ✅ RAG document search
- ✅ System tray integration
- ✅ macOS notifications
- ✅ Settings panel for API keys
- ✅ Document edit mode with LLM merge
- ✅ Modern UI with shadcn/ui components
- ✅ System-based light/dark mode support

## Usage

1. Launch the app
2. Click "Start Listening" or use the tray icon
3. Speak into your microphone
4. Wait ~5 seconds for transcription and insights
5. View insights in the app window or notifications

### Editing Documents

- Click the **"Edit"** button to enter edit mode
- While in edit mode:
  - Audio recording continues (chunks are still captured)
  - LLM polling pauses (no automatic updates)
  - Document becomes editable (markdown textarea)
- Click **"Done Editing"** to exit edit mode:
  - Your edits are saved
  - LLM immediately merges your changes with new transcripts
  - Normal LLM polling resumes

## Architecture

### Audio Pipeline
1. Desktop captures audio chunks (60s intervals)
2. Chunks uploaded to backend
3. Backend transcribes with OpenAI Whisper
4. Embeddings generated and stored
5. Insights generated with RAG context
6. Insights displayed in UI and notifications

### RAG Pipeline
1. Documents ingested and chunked
2. Chunks embedded and stored in Supabase
3. Query embeddings generated for transcripts
4. Vector similarity search finds relevant chunks
5. Context included in insight generation

## License

Private - MVP for personal use

