#!/bin/bash

# Test script for Chunk 12: End-to-End Audio Pipeline
# Full flow: capture → transcribe → insight → display

set -e

echo "🧪 Testing Chunk 12: End-to-End Audio Pipeline"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in project root"
    exit 1
fi

# Check for API service
if [ ! -f "desktop/src/services/api.ts" ]; then
    echo "❌ ERROR: desktop/src/services/api.ts not found"
    exit 1
fi

echo "✓ Found API service"

# Check for upload function
if ! grep -q "uploadAudioChunk" desktop/src/services/api.ts; then
    echo "❌ ERROR: uploadAudioChunk function not found"
    exit 1
fi

echo "✓ uploadAudioChunk function found"

# Check for getInsight function
if ! grep -q "getInsight" desktop/src/services/api.ts; then
    echo "❌ ERROR: getInsight function not found"
    exit 1
fi

echo "✓ getInsight function found"

# Check if App.tsx uses these functions
if ! grep -q "uploadAudioChunk\|getInsight" desktop/src/App.tsx; then
    echo "⚠️  WARNING: App.tsx may not be using API functions"
else
    echo "✓ App.tsx integrates with API"
fi

echo ""
echo "✅ Chunk 12 structure test passed!"
echo "   - API service for backend communication"
echo "   - Audio upload integration"
echo "   - Insight retrieval integration"
echo ""
echo "To test full flow:"
echo "  1. Start backend: cd backend && pnpm dev"
echo "  2. Start desktop: cd desktop && pnpm tauri:dev"
echo "  3. Click 'Start Listening'"
echo "  4. Wait for chunks to be captured and processed"
echo ""
echo "Next: Run 'pnpm test:chunk-13' to test tray icon"

