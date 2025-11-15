# Meeting Copilot MVP – Tech Brief for Cursor

Lightweight desktop app that listens during calls, sends short audio chunks to OpenAI, and surfaces helpful context in real time. Built to be “vibe code” friendly and shippable as a scrappy MVP.

---

## 1. Concept

**Working title:** Meeting Copilot

**Core idea:**  
A desktop app that:

- Detects when I am in a call  
- Captures short audio snippets from my mic (for example 30–60 seconds)  
- Sends them to OpenAI for transcription and analysis  
- Optionally does a RAG lookup against my own docs  
- Pops up small, timely insights while the call is still happening

This is not a full note taker. The goal is “useful in the moment” hints and background.

---

## 2. Primary User Story

> As a person in a Zoom or Meet call  
> I want a lightweight assistant that listens and gives me relevant context mid conversation  
> So I can sound prepared and remember details without digging through docs

Example behaviors:

- I mention “the membership funnel experiment” and it surfaces my last spec or notes  
- Someone asks “what did we decide last time” and it shows a short summary of the previous call  
- I describe a problem and it suggests 2–3 bullet ideas in a tiny overlay

---

## 3. High Level Architecture

Desktop centric MVP. One backend. Minimal moving parts.

- **Desktop app (Electron)**
  - Captures audio chunks from system mic
  - Basic UI: on/off toggle, recent events list, settings
  - Sends audio chunks and metadata to backend via HTTPS or WebSocket
  - Receives insights and displays them as small notifications or side panel

- **Backend (Node / TypeScript)**
  - Handles auth and per user API keys if needed
  - Uses OpenAI:
    - Audio transcription
    - Embedding generation
    - Chat completion for insights
  - Uses **Supabase**:
    - Postgres for core tables
    - Vector extension for embedding storage and retrieval (RAG)
  - Exposes simple JSON APIs for:
    - `/ingest/audio-chunk`
    - `/insight/for-chunk`
    - `/documents/search`

---

## 4. Tech Stack Choices

Keep it JavaScript / TypeScript and modern.

**Desktop**

- `Electron`
- `React`
- `TypeScript`
- Local storage for simple user config

**Backend**

- `Node` + `TypeScript`
- Hosted on `Vercel` or `Railway`
- `Supabase` with pgvector

**AI**

- OpenAI:
  - Transcription
  - Embeddings
  - Chat completions

---

## 5. MVP Scope

### 5.1 Features in scope

- Manual toggle listening
- Audio chunk capture
- Transcription pipeline
- Insight generation
- Simple RAG retrieval
- Notification UI

### 5.2 Non‑goals

- Full transcription UI  
- Complex scheduling  
- Multi‑tenant SaaS  
- Auto‑detect app switching

---

## 6. Data Model Sketch

```sql
CREATE TABLE users (...);
CREATE TABLE documents (...);
CREATE TABLE meeting_snippets (...);
CREATE TABLE insights (...);
```

---

## 7. Core Flows

### Listening Flow

1. Start listening  
2. Capture 30–60 sec chunks  
3. Send to backend  
4. Transcribe + generate insight  
5. Push back to desktop  
6. Display popup  

### Insight Pipeline

- Embed transcript  
- Vector search  
- Build prompt  
- Generate 1–3 bullets  
- Store + return

---

## 8. Desktop App UI

- Tray icon  
- Simple window  
- Notifications  
- Settings  

---

## 9. Privacy

- Manual toggle  
- Clear indicator  
- Option to avoid raw audio storage  

---

## 10. Phases

1. Skeleton  
2. OpenAI integration  
3. RAG layer  
4. Quality pass  

---

## 11. Dev Notes

- Monorepo with pnpm  
- Shared types  
- Environment variables for secrets  

---

## 12. Prompt Direction

> You are a real time meeting assistant.  
> Provide 1–3 helpful bullets.  
> Do not summarize.  
> Focus on what helps right now.

---
