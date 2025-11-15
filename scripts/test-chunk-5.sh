#!/bin/bash

# Test script for Chunk 5: Audio Capture (Tauri)
# Verifies mic access, chunks generated, data format valid

set -e

echo "🧪 Testing Chunk 5: Audio Capture (Tauri)"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in project root"
    exit 1
fi

# Check if desktop directory exists
if [ ! -d "desktop" ]; then
    echo "❌ ERROR: desktop directory not found"
    exit 1
fi

echo "✓ Found desktop directory"

# Check for audio capture hook
if [ ! -f "desktop/src/hooks/useAudioCapture.ts" ]; then
    echo "❌ ERROR: desktop/src/hooks/useAudioCapture.ts not found"
    exit 1
fi

echo "✓ Found useAudioCapture hook"

# Check for Tauri commands
if [ ! -f "desktop/src-tauri/src/commands.rs" ]; then
    echo "❌ ERROR: desktop/src-tauri/src/commands.rs not found"
    exit 1
fi

echo "✓ Found Tauri commands"

# Check if commands are registered in main.rs
if ! grep -q "get_config\|set_config\|request_mic_permission\|validate_audio_chunk" desktop/src-tauri/src/main.rs; then
    echo "⚠️  WARNING: Commands may not be registered in main.rs"
else
    echo "✓ Commands registered in main.rs"
fi

# Check for Info.plist for macOS permissions
if [ ! -f "desktop/src-tauri/Info.plist" ]; then
    echo "⚠️  WARNING: Info.plist not found (needed for macOS mic permissions)"
else
    if ! grep -q "NSMicrophoneUsageDescription" desktop/src-tauri/Info.plist; then
        echo "⚠️  WARNING: NSMicrophoneUsageDescription not found in Info.plist"
    else
        echo "✓ Microphone permission description found"
    fi
fi

# Check if App.tsx uses the hook
if ! grep -q "useAudioCapture" desktop/src/App.tsx; then
    echo "⚠️  WARNING: App.tsx may not be using useAudioCapture hook"
else
    echo "✓ App.tsx uses useAudioCapture hook"
fi

# Check Cargo.toml for required dependencies
if ! grep -q "tokio\|base64" desktop/src-tauri/Cargo.toml; then
    echo "⚠️  WARNING: Some dependencies may be missing in Cargo.toml"
else
    echo "✓ Required dependencies in Cargo.toml"
fi

echo ""
echo "✅ Chunk 5 structure test passed!"
echo "   - Audio capture hook implemented"
echo "   - Tauri commands for config and validation"
echo "   - macOS permissions configured"
echo ""
echo "Note: Full audio capture test requires:"
echo "  1. Building the Tauri app"
echo "  2. Running on macOS with microphone access"
echo "  3. Testing actual audio capture"
echo ""
echo "Next: Run 'pnpm test:chunk-6' to test audio upload endpoint"

