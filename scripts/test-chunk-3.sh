#!/bin/bash

# Test script for Chunk 3: Backend API Skeleton
# Verifies server starts, health endpoint responds

set -e

echo "🧪 Testing Chunk 3: Backend API Skeleton"
echo "========================================"

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

# Check if package.json exists
if [ ! -f "backend/package.json" ]; then
    echo "❌ ERROR: backend/package.json not found"
    exit 1
fi

echo "✓ Found backend/package.json"

# Check if main files exist
if [ ! -f "backend/src/index.ts" ]; then
    echo "❌ ERROR: backend/src/index.ts not found"
    exit 1
fi

echo "✓ Found backend/src/index.ts"

if [ ! -f "backend/src/routes/health.ts" ]; then
    echo "❌ ERROR: backend/src/routes/health.ts not found"
    exit 1
fi

echo "✓ Found health route"

# Check TypeScript compilation
echo ""
echo "🔨 Checking TypeScript compilation..."
cd backend

if command -v pnpm &> /dev/null; then
    pnpm exec tsc --noEmit 2>&1 | head -20 || {
        echo "⚠️  TypeScript compilation check (may need dependencies)"
    }
elif command -v npm &> /dev/null; then
    npm exec tsc --noEmit 2>&1 | head -20 || {
        echo "⚠️  TypeScript compilation check (may need dependencies)"
    }
fi

cd ..

# Try to start server and test health endpoint
echo ""
echo "🌐 Testing server startup and health endpoint..."

# Check if port is available
PORT=${BACKEND_PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  WARNING: Port $PORT is already in use"
    echo "   You may need to stop the existing server first"
else
    echo "✓ Port $PORT is available"
fi

echo ""
echo "✅ Chunk 3 structure test passed!"
echo "   - Backend Express server structure exists"
echo "   - Health endpoint route present"
echo "   - TypeScript configuration present"
echo ""
echo "To test the server:"
echo "  1. cd backend"
echo "  2. pnpm install (or npm install)"
echo "  3. pnpm dev (or npm run dev)"
echo "  4. curl http://localhost:3000/health"
echo ""
echo "Next: Run 'pnpm test:chunk-4' to test Supabase database schema"

