# Creeper Setup Guide

## ✅ Completed Steps

- [x] Monorepo structure created
- [x] Database migrations run
- [x] Supabase connection verified
- [x] Environment variables configured

## Next Steps

### 1. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Build shared types package
cd shared && pnpm build && cd ..
```

### 2. Verify Environment Variables

Make sure your `.env` file in the project root has:
- ✅ `OPENAI_API_KEY` (you have this)
- ✅ `SUPABASE_URL` (you have this)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (you have this)

### 3. Test Backend

```bash
cd backend
pnpm dev
```

The backend should start on `http://localhost:3000`. Test it:
```bash
curl http://localhost:3000/health
```

### 4. Set Up Tauri (Desktop App)

**Prerequisites:**
- Rust and Cargo (for Tauri)
- Xcode Command Line Tools (macOS)

**If Rust is not installed:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Install Tauri CLI:**
```bash
cargo install tauri-cli --version "^2.0.0" --locked
```

### 5. Test Desktop App

```bash
cd desktop
pnpm tauri:dev
```

This will:
- Build the React frontend
- Compile the Rust backend
- Launch the Tauri app window

**Note:** First build may take a while as it compiles Rust dependencies.

### 6. Test Full Pipeline

1. Start backend: `cd backend && pnpm dev`
2. Start desktop: `cd desktop && pnpm tauri:dev`
3. In the desktop app:
   - Click "Start Listening"
   - Grant microphone permissions when prompted
   - Speak into your microphone
   - Wait ~5 seconds for transcription and insights

## Troubleshooting

### Backend Issues

- **Port already in use**: Change `BACKEND_PORT` in `.env`
- **Supabase connection fails**: Verify `.env` values are correct
- **OpenAI errors**: Check your API key has credits

### Desktop App Issues

- **Rust not found**: Install Rust via rustup
- **Tauri build fails**: Make sure Xcode Command Line Tools are installed:
  ```bash
  xcode-select --install
  ```
- **Microphone permissions**: Check System Settings → Privacy & Security → Microphone

### Database Issues

- **Tables missing**: Re-run migrations in Supabase SQL Editor
- **pgvector errors**: Make sure extension is enabled in Supabase dashboard

## Quick Test Commands

```bash
# Test Supabase connection
cd backend && npm run test:supabase

# Test backend health
curl http://localhost:3000/health

# Run all chunk tests
pnpm test:chunk-1
pnpm test:chunk-2
# ... etc
```

## Development Workflow

1. **Backend development**: `cd backend && pnpm dev` (auto-reloads on changes)
2. **Desktop development**: `cd desktop && pnpm tauri:dev` (hot-reloads React, rebuilds Rust on changes)
3. **Shared types**: Edit in `shared/src/`, rebuild with `cd shared && pnpm build`

## Next Features to Test

Once basic setup works:
- [ ] Audio capture and chunking
- [ ] Audio upload to backend
- [ ] Transcription pipeline
- [ ] Insight generation
- [ ] Document ingestion for RAG
- [ ] Vector search
- [ ] Notifications

