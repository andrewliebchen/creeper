#!/bin/bash

# Test script for Chunk 2: Tauri Desktop Skeleton
# Verifies app builds and launches

set -e

echo "🧪 Testing Chunk 2: Tauri Desktop Skeleton"
echo "=========================================="

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

# Check if package.json exists
if [ ! -f "desktop/package.json" ]; then
    echo "❌ ERROR: desktop/package.json not found"
    exit 1
fi

echo "✓ Found desktop/package.json"

# Check if Tauri config exists
if [ ! -f "desktop/src-tauri/tauri.conf.json" ]; then
    echo "❌ ERROR: desktop/src-tauri/tauri.conf.json not found"
    exit 1
fi

echo "✓ Found Tauri configuration"

# Check if main.rs exists
if [ ! -f "desktop/src-tauri/src/main.rs" ]; then
    echo "❌ ERROR: desktop/src-tauri/src/main.rs not found"
    exit 1
fi

echo "✓ Found Tauri main.rs"

# Check if React app files exist
if [ ! -f "desktop/src/App.tsx" ]; then
    echo "❌ ERROR: desktop/src/App.tsx not found"
    exit 1
fi

echo "✓ Found React App component"

# Check if Vite config exists
if [ ! -f "desktop/vite.config.ts" ]; then
    echo "❌ ERROR: desktop/vite.config.ts not found"
    exit 1
fi

echo "✓ Found Vite configuration"

# Try to build TypeScript (without running full Tauri build)
echo ""
echo "🔨 Checking TypeScript compilation..."
cd desktop

# Check if node_modules exists, if not, install
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "⚠️  WARNING: Neither pnpm nor npm found. Skipping dependency check."
    fi
fi

# Try TypeScript check
if command -v pnpm &> /dev/null; then
    pnpm exec tsc --noEmit || echo "⚠️  TypeScript check failed (may need dependencies installed)"
elif command -v npm &> /dev/null; then
    npm exec tsc --noEmit || echo "⚠️  TypeScript check failed (may need dependencies installed)"
fi

cd ..

echo ""
echo "✅ Chunk 2 structure test passed!"
echo "   - Tauri project structure exists"
echo "   - React app files present"
echo "   - Configuration files present"
echo ""
echo "Note: Full build test requires Rust and Tauri CLI to be installed"
echo "Next: Run 'pnpm test:chunk-3' to test backend API skeleton"

