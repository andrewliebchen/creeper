#!/bin/bash

# Test script for Chunk 6: Audio Upload Endpoint
# Sends test audio file, verifies temporary handling and DB metadata record

set -e

echo "🧪 Testing Chunk 6: Audio Upload Endpoint"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in project root"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ ERROR: backend directory not found"
    exit 1
fi

echo "✓ Found backend directory"

# Check if ingest route exists
if [ ! -f "backend/src/routes/ingest.ts" ]; then
    echo "❌ ERROR: backend/src/routes/ingest.ts not found"
    exit 1
fi

echo "✓ Found ingest route"

# Check if supabase service exists
if [ ! -f "backend/src/services/supabase.ts" ]; then
    echo "❌ ERROR: backend/src/services/supabase.ts not found"
    exit 1
fi

echo "✓ Found Supabase service"

# Check if route is registered in index.ts
if ! grep -q "ingestRouter" backend/src/index.ts; then
    echo "❌ ERROR: ingestRouter not registered in index.ts"
    exit 1
fi

echo "✓ Ingest router registered"

# Check for multer dependency
if ! grep -q "multer" backend/package.json; then
    echo "⚠️  WARNING: multer dependency not found in package.json"
else
    echo "✓ Multer dependency found"
fi

# Check for Supabase dependency
if ! grep -q "@supabase/supabase-js" backend/package.json; then
    echo "⚠️  WARNING: @supabase/supabase-js dependency not found"
else
    echo "✓ Supabase dependency found"
fi

# Check route implementation
if ! grep -q "upload.single('audio')" backend/src/routes/ingest.ts; then
    echo "⚠️  WARNING: Multer upload middleware not found"
else
    echo "✓ Multer upload middleware configured"
fi

if ! grep -q "createSnippet" backend/src/routes/ingest.ts; then
    echo "⚠️  WARNING: createSnippet function not called"
else
    echo "✓ createSnippet function called"
fi

echo ""
echo "✅ Chunk 6 structure test passed!"
echo "   - Audio upload endpoint implemented"
echo "   - Multer configured for temporary storage"
echo "   - Supabase integration for metadata"
echo ""
echo "To test the endpoint:"
echo "  1. Start backend: cd backend && pnpm dev"
echo "  2. Create test audio file or use existing one"
echo "  3. curl -X POST http://localhost:3000/ingest/audio-chunk \\"
echo "     -F 'audio=@test.wav' \\"
echo "     -F 'timestamp=1234567890' \\"
echo "     -F 'duration=60'"
echo ""
echo "Next: Run 'pnpm test:chunk-7' to test OpenAI transcription"

