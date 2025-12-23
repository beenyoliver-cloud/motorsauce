#!/usr/bin/env node

/**
 * Apply SQL fixes to Supabase database
 * This script applies the respond_offer RPC and trigger functions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySQLFile(filePath) {
  console.log(`📄 Reading SQL file: ${filePath}`);
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log('🚀 Executing SQL...');
    console.log('─'.repeat(60));
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If exec_sql doesn't exist, try raw query
      return supabase.from('_').select('*').limit(0).then(() => {
        throw new Error('Cannot execute raw SQL via client. Please use Supabase Dashboard.');
      });
    });
    
    if (error) {
      console.error('❌ SQL execution failed:', error);
      
      console.log('\n📝 Manual instructions:');
      const projectId = SUPABASE_URL.split('//')[1]?.split('.')[0] || 'YOUR_PROJECT_ID';
      console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
      console.log('2. Copy the contents of: sql/fix_unread_status_trigger.sql');
      console.log('3. Paste into SQL Editor');
      console.log('4. Click "Run" or press Cmd+Enter');
      
      return false;
    }
    
    console.log('✅ SQL executed successfully!');
    console.log('─'.repeat(60));
    
    return true;
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    console.log('\n📝 Manual instructions:');
    const projectId = SUPABASE_URL.split('//')[1]?.split('.')[0] || 'YOUR_PROJECT_ID';
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
    console.log('2. Copy the contents of: sql/fix_unread_status_trigger.sql');
    console.log('3. Paste into SQL Editor');
    console.log('4. Click "Run" or press Cmd+Enter');
    
    return false;
  }
}

async function verifyFunctions() {
  console.log('\n🔍 Verifying functions exist...');
  
  try {
    // Try to call respond_offer with invalid params to see if it exists
    const { error } = await supabase.rpc('respond_offer', {
      p_offer_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'test'
    });
    
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ respond_offer function does not exist');
      return false;
    }
    
    console.log('✅ respond_offer function exists');
    return true;
  } catch (err) {
    console.log('⚠️  Could not verify functions');
    return false;
  }
}

async function main() {
  console.log('🔧 Motorsauce SQL Fix Applicator');
  console.log('═'.repeat(60));
  
  const sqlFile = join(__dirname, '..', 'sql', 'fix_unread_status_trigger.sql');
  
  // First verify if functions already exist
  const exists = await verifyFunctions();
  
  if (exists) {
    console.log('\n✅ Functions already exist in database!');
    console.log('You can test offer buttons now.');
    return;
  }
  
  console.log('\n⚠️  Functions not found. Attempting to apply SQL...');
  
  const success = await applySQLFile(sqlFile);
  
  if (!success) {
    console.log('\n❌ Could not apply SQL automatically.');
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Open: https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo/sql/new');
    console.log('2. Open file: sql/fix_unread_status_trigger.sql');
    console.log('3. Copy ALL contents (214 lines)');
    console.log('4. Paste into Supabase SQL Editor');
    console.log('5. Click "Run" button');
    console.log('6. You should see "Success" message');
    console.log('\nThen try accepting an offer again!');
    process.exit(1);
  }
  
  // Verify again
  await verifyFunctions();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
