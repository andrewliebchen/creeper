#!/usr/bin/env tsx
// Run migration 005: Living document support
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });
dotenv.config(); // Also try current directory

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Running migration 005: Living document support...\n');

  // Read the migration file
  const migrationPath = resolve(process.cwd(), 'supabase/migrations/005_living_document.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons to run statements separately (Supabase doesn't support multi-statement queries directly)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  try {
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 60)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        // If exec_sql doesn't exist, try direct query (may not work for DDL)
        if (error && error.message.includes('exec_sql')) {
          // Fallback: Use raw SQL execution via PostgREST (limited)
          // For DDL statements, we need to use the Supabase dashboard or psql
          console.log('   ⚠️  Direct SQL execution not available via API');
          console.log('   Please run this migration in Supabase SQL Editor:');
          console.log(`   ${migrationPath}\n`);
          console.log('   Or use psql to connect and run the migration file.');
          process.exit(1);
        }
        
        if (error) {
          // Some errors are expected (IF NOT EXISTS clauses)
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`   ✓ (already exists)`);
          } else {
            throw error;
          }
        } else {
          console.log(`   ✓ Success`);
        }
      }
    }

    console.log('\n✅ Migration 005 completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n   Please run the migration manually in Supabase SQL Editor:');
    console.error(`   File: ${migrationPath}`);
    process.exit(1);
  }
}

runMigration();

