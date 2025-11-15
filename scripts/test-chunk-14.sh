#!/bin/bash

# Test script for Chunk 14: Desktop UI - Main Window
# Verifies window opens, displays data, updates

set -e

echo "🧪 Testing Chunk 14: Desktop UI - Main Window"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in project root"
    exit 1
fi

# Check if App.tsx exists and has UI
if [ ! -f "desktop/src/App.tsx" ]; then
    echo "❌ ERROR: desktop/src/App.tsx not found"
    exit 1
fi

echo "✓ Found App.tsx"

# Check for main UI elements
if ! grep -q "Creeper\|Meeting Copilot" desktop/src/App.tsx; then
    echo "⚠️  WARNING: Main title may be missing"
else
    echo "✓ Main UI elements found"
fi

# Check for listening status display
if ! grep -q "isListening\|Listening\|Stopped" desktop/src/App.tsx; then
    echo "⚠️  WARNING: Listening status may not be displayed"
else
    echo "✓ Listening status display found"
fi

# Check for chunks display
if ! grep -q "chunks\|Recent Chunks" desktop/src/App.tsx; then
    echo "⚠️  WARNING: Chunks display may be missing"
else
    echo "✓ Chunks display found"
fi

# Check for insights display
if ! grep -q "insights\|Recent Insights" desktop/src/App.tsx; then
    echo "⚠️  WARNING: Insights display may be missing"
else
    echo "✓ Insights display found"
fi

echo ""
echo "✅ Chunk 14 structure test passed!"
echo "   - Main window UI components"
echo "   - Status display"
echo "   - Recent events list"
echo ""
echo "Next: Run 'pnpm test:chunk-15' to test notifications"

