#!/bin/bash

# Test script for Chunk 1: Monorepo Foundation
# Verifies workspace installs, shared types compile

set -e

echo "🧪 Testing Chunk 1: Monorepo Foundation"
echo "======================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ ERROR: pnpm is not installed"
    echo "   Install with: npm install -g pnpm"
    exit 1
fi

echo "✓ pnpm is installed: $(pnpm --version)"

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: pnpm-workspace.yaml not found"
    echo "   Make sure you're in the project root"
    exit 1
fi

echo "✓ Found pnpm-workspace.yaml"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json not found"
    exit 1
fi

echo "✓ Found root package.json"

# Check if shared package exists
if [ ! -f "shared/package.json" ]; then
    echo "❌ ERROR: shared/package.json not found"
    exit 1
fi

echo "✓ Found shared package"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

# Build shared types
echo ""
echo "🔨 Building shared types package..."
cd shared
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Failed to build shared types"
    exit 1
fi

# Check if dist directory was created
if [ ! -d "dist" ]; then
    echo "❌ ERROR: dist directory not created"
    exit 1
fi

echo "✓ Shared types built successfully"

# Check if type definitions exist
if [ ! -f "dist/index.d.ts" ]; then
    echo "❌ ERROR: Type definitions not generated"
    exit 1
fi

echo "✓ Type definitions generated"

# Check if .env.example exists
cd ..
if [ ! -f ".env.example" ]; then
    echo "❌ ERROR: .env.example not found"
    exit 1
fi

echo "✓ Found .env.example"

echo ""
echo "✅ Chunk 1 test passed!"
echo "   - pnpm workspace configured"
echo "   - Shared types package compiles"
echo "   - Environment template exists"
echo ""
echo "Next: Run 'pnpm test:chunk-2' to test Tauri desktop skeleton"

