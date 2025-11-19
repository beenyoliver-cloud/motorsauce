#!/usr/bin/env node
/**
 * Check if the messaging system database schema is properly set up
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking messaging system database schema...\n');

async function checkSchema() {
  try {
    // Check if threads table has new columns
    const { data: threads, error: threadsError } = await supabase
      .from('threads')
      .select('participant_1_id, participant_2_id, listing_ref, last_message_text')
      .limit(1);

    if (threadsError) {
      if (threadsError.message.includes('column') && threadsError.message.includes('does not exist')) {
        console.log('❌ THREADS TABLE: Missing new columns (participant_1_id, participant_2_id)');
        console.log('   Error:', threadsError.message);
        console.log('\n📋 ACTION REQUIRED: Run the SQL migration from sql/create_messaging_system.sql');
        return false;
      } else if (threadsError.code === 'PGRST116') {
        console.log('❌ THREADS TABLE: Table does not exist');
        console.log('\n📋 ACTION REQUIRED: Run the SQL migration from sql/create_messaging_system.sql');
        return false;
      } else {
        console.log('⚠️  THREADS TABLE: Unexpected error:', threadsError.message);
        return false;
      }
    }

    console.log('✅ THREADS TABLE: Has new schema (participant_1_id, participant_2_id)');

    // Check messages table
    const { error: messagesError } = await supabase
      .from('messages')
      .select('thread_id, from_user_id, message_type')
      .limit(1);

    if (messagesError) {
      if (messagesError.code === 'PGRST116') {
        console.log('❌ MESSAGES TABLE: Does not exist');
        return false;
      }
      console.log('⚠️  MESSAGES TABLE: Error:', messagesError.message);
      return false;
    }

    console.log('✅ MESSAGES TABLE: Exists with correct schema');

    // Check offers table
    const { error: offersError } = await supabase
      .from('offers')
      .select('thread_id, starter_id, recipient_id')
      .limit(1);

    if (offersError) {
      if (offersError.code === 'PGRST116') {
        console.log('❌ OFFERS TABLE: Does not exist');
        return false;
      }
      console.log('⚠️  OFFERS TABLE: Error:', offersError.message);
      return false;
    }

    console.log('✅ OFFERS TABLE: Exists with correct schema');

    // Check thread_deletions table
    const { error: deletionsError } = await supabase
      .from('thread_deletions')
      .select('thread_id, user_id')
      .limit(1);

    if (deletionsError) {
      if (deletionsError.code === 'PGRST116') {
        console.log('❌ THREAD_DELETIONS TABLE: Does not exist');
        return false;
      }
      console.log('⚠️  THREAD_DELETIONS TABLE: Error:', deletionsError.message);
      return false;
    }

    console.log('✅ THREAD_DELETIONS TABLE: Exists with correct schema');

    // Check thread_read_status table
    const { error: readError } = await supabase
      .from('thread_read_status')
      .select('thread_id, user_id')
      .limit(1);

    if (readError) {
      if (readError.code === 'PGRST116') {
        console.log('❌ THREAD_READ_STATUS TABLE: Does not exist');
        return false;
      }
      console.log('⚠️  THREAD_READ_STATUS TABLE: Error:', readError.message);
      return false;
    }

    console.log('✅ THREAD_READ_STATUS TABLE: Exists with correct schema');

    console.log('\n✅ All messaging tables are properly configured!');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

checkSchema().then((success) => {
  if (!success) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TO FIX THIS:');
    console.log('   1. Open your Supabase Dashboard → SQL Editor');
    console.log('   2. Copy the contents of sql/create_messaging_system.sql');
    console.log('   3. Paste and click "Run"');
    console.log('   4. Verify success message appears');
    console.log('   5. Run this script again to verify');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
  process.exit(0);
});
