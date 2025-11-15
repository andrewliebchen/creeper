#!/usr/bin/env tsx
// Test Supabase connection

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
// When running from backend/, go up one level to find .env
const envPath = resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

// Also try current directory in case running from root
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

console.log('🔌 Testing Supabase connection...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Basic connection - query a system table
    console.log('\n📊 Test 1: Basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count')
      .limit(0);

    if (tablesError && tablesError.code !== 'PGRST116') {
      // PGRST116 is "relation does not exist" - which is fine, means we're connected
      throw tablesError;
    }

    console.log('   ✓ Connected to Supabase');

    // Test 2: Check if tables exist
    console.log('\n📋 Test 2: Checking tables...');
    const tablesToCheck = ['users', 'documents', 'document_chunks', 'meeting_snippets', 'insights'];
    
    for (const table of tablesToCheck) {
      const { error } = await supabase.from(table).select('count').limit(0);
      if (error && error.code === 'PGRST116') {
        console.log(`   ✗ Table '${table}' does not exist (migrations may not be run)`);
      } else if (error) {
        console.log(`   ⚠️  Table '${table}': ${error.message}`);
      } else {
        console.log(`   ✓ Table '${table}' exists`);
      }
    }

    // Test 3: Check pgvector extension
    console.log('\n🔍 Test 3: Checking pgvector extension...');
    // Try to query a vector column - if it works, pgvector is enabled
    const { error: vectorError } = await supabase
      .from('document_chunks')
      .select('embedding')
      .limit(0);
    
    if (vectorError) {
      if (vectorError.code === 'PGRST116') {
        console.log('   ⚠️  Cannot check - tables may not exist');
      } else if (vectorError.message && (vectorError.message.includes('vector') || vectorError.message.includes('type'))) {
        console.log('   ⚠️  pgvector may not be enabled:', vectorError.message);
      } else {
        console.log('   ⚠️  Error checking pgvector:', vectorError.message || 'Unknown error');
      }
    } else {
      console.log('   ✓ pgvector appears to be enabled (can query vector columns)');
    }

    // Test 4: Check RPC functions
    console.log('\n⚙️  Test 4: Checking RPC functions...');
    const { error: funcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: Array(1536).fill(0).map(() => Math.random()),
      match_threshold: 0.7,
      match_count: 1,
      user_id_filter: null
    });

    if (funcError) {
      const errorMsg = funcError.message || '';
      if (errorMsg.includes('does not exist') || errorMsg.includes('function')) {
        console.log('   ✗ RPC function "match_document_chunks" does not exist (migration 003 may not be run)');
      } else if (errorMsg.includes('relation') || errorMsg.includes('column') || errorMsg.includes('No rows')) {
        console.log('   ✓ RPC function exists (error is expected - no data yet)');
      } else {
        console.log('   ⚠️  RPC function check:', errorMsg || 'Unknown error');
      }
    } else {
      console.log('   ✓ RPC function "match_document_chunks" exists and works');
    }

    console.log('\n✅ Connection test complete!');
    console.log('\n📝 Summary:');
    console.log('   - Supabase connection: ✓');
    console.log('   - Check individual table/function status above');
    
  } catch (error: any) {
    console.error('\n❌ Connection test failed:');
    console.error('   Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    process.exit(1);
  }
}

testConnection();

