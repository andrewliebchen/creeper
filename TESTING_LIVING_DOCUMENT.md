# Testing Guide: Living Document Session Architecture

This guide helps you test the new living document features.

## Prerequisites

1. **Migration 005 must be run** in Supabase SQL Editor
2. **Build shared types:**
   ```bash
   cd shared && pnpm build
   ```
3. **Backend running:**
   ```bash
   cd backend && pnpm dev
   ```
4. **Desktop app running:**
   ```bash
   cd desktop && pnpm tauri:dev
   ```

## Testing Checklist

### 1. Backend API Endpoints

#### Test Session List
```bash
curl http://localhost:3000/sessions
```
**Expected:** Returns array of sessions with metadata

#### Test Create Session
```bash
curl -X POST http://localhost:3000/sessions/create \
  -H "Content-Type: application/json"
```
**Expected:** Returns `{ "sessionId": "..." }`

#### Test Get Session
```bash
# Replace SESSION_ID with actual ID from create
curl http://localhost:3000/sessions/SESSION_ID
```
**Expected:** Returns session with document (may be null if no document yet)

#### Test Update Document
```bash
curl -X PUT http://localhost:3000/sessions/SESSION_ID/document \
  -H "Content-Type: application/json" \
  -d '{"content": "Test document content\n\n- First note\n- Second note"}'
```
**Expected:** Returns updated document with `userEditedAt` timestamp

#### Test Resume Session
```bash
# First end a session
curl -X POST http://localhost:3000/sessions/SESSION_ID/end

# Then resume it
curl -X POST http://localhost:3000/sessions/SESSION_ID/resume
```
**Expected:** Returns success, session `ended_at` should be null

### 2. Frontend UI Testing

#### Session List
1. **Open the app** - Should show session list in sidebar
2. **Check empty state** - If no sessions, should show "No sessions yet"
3. **Create new session** - Click "+ New" button
4. **Verify** - New session appears in list with "Active" badge

#### Session View
1. **Select a session** - Click on any session in the list
2. **Verify display:**
   - Session ID shown
   - Start time shown
   - Document editor visible
   - Listening controls visible

#### Document Editor
1. **Edit document:**
   - Type some text in the document editor
   - Wait 2 seconds OR click outside the textarea
2. **Verify auto-save:**
   - "Saving..." indicator appears briefly
   - "Saved [time]" appears
3. **Check database:**
   - Query `insights` table in Supabase
   - Verify `user_edited_at` is set
   - Verify `content` matches what you typed

#### Listening & LLM Updates
1. **Start listening:**
   - Click "Start Listening" button
   - Speak into microphone for 30-60 seconds
2. **Wait for transcription:**
   - Backend processes audio (check backend logs)
   - Document should update automatically
3. **Verify LLM update:**
   - "LLM is updating..." indicator appears
   - Document content updates with insights
   - Notification appears with bullets

#### User Edit + LLM Merge
1. **Edit document manually:**
   - Add your own notes: "My custom note: ..."
   - Save (auto-save or blur)
2. **Continue listening:**
   - Let LLM generate more insights
3. **Verify merge:**
   - Your custom notes should still be in the document
   - LLM should add new information without overwriting yours
   - Check backend logs for "user has edited" prompt

#### Resume Session
1. **End a session:**
   - Click "Stop Listening"
   - Session should show as ended (no "Active" badge)
2. **Resume session:**
   - Click on the ended session
   - Click "Resume" button
3. **Verify:**
   - Session becomes active again
   - Can start listening with same sessionId
   - Document persists from before

### 3. Database Verification

#### Check Migration Applied
```sql
-- In Supabase SQL Editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'insights' 
  AND column_name = 'user_edited_at';
```
**Expected:** Returns `user_edited_at` column with type `timestamp with time zone`

#### Check Index Created
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'insights' 
  AND indexname = 'idx_insights_user_edited_at';
```
**Expected:** Returns the index name

#### Check User Edits Tracked
```sql
SELECT id, user_edited_at, updated_at, content 
FROM insights 
WHERE user_edited_at IS NOT NULL
ORDER BY user_edited_at DESC 
LIMIT 5;
```
**Expected:** Returns insights where user has edited, with timestamps

### 4. Integration Flow Test

**Complete workflow:**
1. ✅ Create new session
2. ✅ Start listening
3. ✅ Wait for first insight (LLM generates)
4. ✅ Edit document manually
5. ✅ Continue listening (LLM merges with your edits)
6. ✅ Stop listening
7. ✅ Edit document again
8. ✅ Resume session
9. ✅ Start listening again
10. ✅ Verify document persists and updates continue

## Common Issues

### "No sessions yet" but sessions exist
- **Check:** Backend is running and connected to Supabase
- **Check:** User ID matches in database

### Document not saving
- **Check:** Backend logs for errors
- **Check:** Network tab in browser devtools
- **Check:** `user_edited_at` column exists in database

### LLM overwrites user edits
- **Check:** Backend logs for "user has edited" message
- **Check:** `user_edited_at > updated_at` in database
- **Check:** Prompt includes user's current document

### Resume not working
- **Check:** Session `ended_at` is set before resume
- **Check:** Resume endpoint returns success
- **Check:** Session `ended_at` is null after resume

## Quick Test Script

Save this as `test-living-document.sh`:

```bash
#!/bin/bash
BACKEND_URL="http://localhost:3000"

echo "🧪 Testing Living Document Features"
echo ""

# Create session
echo "1. Creating session..."
SESSION=$(curl -s -X POST $BACKEND_URL/sessions/create | jq -r '.sessionId')
echo "   Session ID: $SESSION"

# Update document
echo "2. Updating document..."
curl -s -X PUT $BACKEND_URL/sessions/$SESSION/document \
  -H "Content-Type: application/json" \
  -d '{"content": "Test document\n\n- Note 1\n- Note 2"}' | jq '.'

# Get session
echo "3. Getting session..."
curl -s $BACKEND_URL/sessions/$SESSION | jq '.'

# List sessions
echo "4. Listing sessions..."
curl -s $BACKEND_URL/sessions | jq '.sessions | length'

echo ""
echo "✅ Basic tests complete!"
```

Run with: `bash test-living-document.sh` (requires `jq` for JSON parsing)

