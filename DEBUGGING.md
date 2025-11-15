# Debugging Guide - Creeper MVP

## How to See Backend Activity

### 1. Backend Logs

The backend logs all activity to the terminal where you started it. Look for:

**When audio chunk is received:**
```
🎤 Audio chunk received:
   Snippet ID: <uuid>
   Size: <bytes> bytes
   Duration: 60s
   Timestamp: <iso-date>
```

**When transcription completes:**
```
📝 Transcription complete:
   Snippet ID: <uuid>
   Transcript: <first 100 chars>...
✓ Generated and stored embedding for snippet <uuid>
```

**When insights are generated:**
```
💡 Generating insights for snippet <uuid>...
✓ Generated 3 insights:
   1. <insight 1>
   2. <insight 2>
   3. <insight 3>
✓ Stored insight <uuid> in database
```

### 2. Frontend Console (Browser DevTools)

In the Tauri app, you can see frontend logs:
1. Right-click in the app window
2. Select "Inspect" or "Inspect Element"
3. Go to the "Console" tab

Look for:
- `Audio chunk ready:` - When audio is captured
- `Chunk uploaded:` - When upload succeeds
- `Failed to upload chunk:` - If upload fails
- `Failed to get insight:` - If insight generation fails

### 3. Check Backend Health

```bash
curl http://localhost:3000/health
```

### 4. Check Database

You can check Supabase dashboard to see:
- `meeting_snippets` table - Audio chunks and transcripts
- `insights` table - Generated insights
- `document_chunks` table - RAG documents (if you've uploaded any)

### 5. Test the Pipeline Manually

**Test audio upload:**
```bash
# Create a test audio file (you'll need a real audio file)
curl -X POST http://localhost:3000/ingest/audio-chunk \
  -F "audio=@test.wav" \
  -F "timestamp=$(date +%s)000" \
  -F "duration=60"
```

**Test insight generation:**
```bash
# First, get a snippet ID from the database or from a successful upload
curl -X POST http://localhost:3000/insight/for-chunk \
  -H "Content-Type: application/json" \
  -d '{"snippetId": "<your-snippet-id>", "transcript": "This is a test transcript"}'
```

## Common Issues

### No logs appearing
- Make sure backend is running: `cd backend && pnpm dev`
- Check if audio chunks are actually being captured (check frontend console)

### Transcription not working
- Check OpenAI API key is set in `.env`
- Check backend logs for OpenAI errors
- Verify you have OpenAI credits

### Insights not appearing
- Wait 5+ seconds after chunk upload (transcription takes time)
- Check backend logs for insight generation
- Check frontend console for errors

### Audio not capturing
- Grant microphone permissions in System Settings
- Check browser console for permission errors
- Make sure you clicked "Start Listening"

## Quick Status Check

```bash
# Backend running?
curl http://localhost:3000/health

# Frontend running?
curl http://localhost:5173

# Check recent snippets in database (via Supabase dashboard)
# Or use the Supabase client in backend
```

