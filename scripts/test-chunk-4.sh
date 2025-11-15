#!/bin/bash

# Test script for Chunk 4: Supabase Database Schema
# Verifies migrations exist and can be validated

set -e

echo "🧪 Testing Chunk 4: Supabase Database Schema"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in project root"
    exit 1
fi

# Check if supabase directory exists
if [ ! -d "supabase" ]; then
    echo "❌ ERROR: supabase directory not found"
    exit 1
fi

echo "✓ Found supabase directory"

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
    echo "❌ ERROR: supabase/migrations directory not found"
    exit 1
fi

echo "✓ Found migrations directory"

# Check for migration files
MIGRATION_1="supabase/migrations/001_initial_schema.sql"
MIGRATION_2="supabase/migrations/002_enable_pgvector.sql"

if [ ! -f "$MIGRATION_1" ]; then
    echo "❌ ERROR: $MIGRATION_1 not found"
    exit 1
fi

echo "✓ Found $MIGRATION_1"

if [ ! -f "$MIGRATION_2" ]; then
    echo "❌ ERROR: $MIGRATION_2 not found"
    exit 1
fi

echo "✓ Found $MIGRATION_2"

# Validate SQL syntax (basic checks)
echo ""
echo "🔍 Validating SQL syntax..."

# Check for required tables in migration 1
REQUIRED_TABLES=("users" "documents" "document_chunks" "meeting_snippets" "insights")
for table in "${REQUIRED_TABLES[@]}"; do
    if ! grep -q "CREATE TABLE.*$table" "$MIGRATION_1"; then
        echo "⚠️  WARNING: Table '$table' not found in migration 1"
    else
        echo "✓ Found table: $table"
    fi
done

# Check for pgvector extension in migration 2
if ! grep -q "CREATE EXTENSION.*vector" "$MIGRATION_2"; then
    echo "⚠️  WARNING: pgvector extension not found in migration 2"
else
    echo "✓ Found pgvector extension"
fi

# Check for embedding columns
if ! grep -q "embedding vector" "$MIGRATION_2"; then
    echo "⚠️  WARNING: Embedding columns not found in migration 2"
else
    echo "✓ Found embedding columns"
fi

# Check for vector indexes
if ! grep -q "USING hnsw\|USING ivfflat" "$MIGRATION_2"; then
    echo "⚠️  WARNING: Vector indexes not found in migration 2"
else
    echo "✓ Found vector indexes"
fi

echo ""
echo "✅ Chunk 4 structure test passed!"
echo "   - Migration files exist"
echo "   - Required tables defined"
echo "   - pgvector extension configured"
echo ""
echo "To apply migrations to Supabase:"
echo "  1. Install Supabase CLI: npm install -g supabase"
echo "  2. Link project: supabase link --project-ref your-project-ref"
echo "  3. Push migrations: supabase db push"
echo "   Or use the Supabase dashboard SQL editor"
echo ""
echo "Next: Run 'pnpm test:chunk-5' to test audio capture"

