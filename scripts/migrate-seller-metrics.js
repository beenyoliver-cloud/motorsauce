#!/usr/bin/env node
// Quick script to create seller_metrics table
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
});

async function main() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'create_seller_metrics.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Creating seller_metrics table...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  
  if (error) {
    // Try direct query if RPC doesn't exist
    const { error: directError } = await supabase.from('_sql').insert({ query: sql });
    if (directError) {
      console.error('Migration failed. Please run this SQL manually in Supabase SQL Editor:');
      console.log('\n' + sql + '\n');
      console.error('Error:', error);
      process.exit(1);
    }
  }
  
  console.log('✅ seller_metrics table created successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
