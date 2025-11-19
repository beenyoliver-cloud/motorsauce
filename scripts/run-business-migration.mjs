#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envPath = join(__dirname, '..', '.env.local');
const envFile = readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = envVars.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Read the SQL migration file
const sqlPath = join(__dirname, '..', 'sql', 'create_business_storefronts.sql');
const sql = readFileSync(sqlPath, 'utf8');

console.log('🚀 Starting business storefront migration...\n');
console.log(`📁 Reading: ${sqlPath}`);
console.log(`📊 SQL length: ${sql.length} characters\n`);

// Execute the migration
async function runMigration() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    
    console.log('✅ Migration executed successfully!\n');
    console.log('📋 Created/Updated:');
    console.log('   ✓ profiles table (account_type, business_verified, total_sales)');
    console.log('   ✓ business_info table');
    console.log('   ✓ promoted_items table');
    console.log('   ✓ business_reviews table');
    console.log('   ✓ business_profiles_public view');
    console.log('   ✓ Helper functions (get_own_business_address, is_promotion_active, etc.)');
    console.log('   ✓ RLS policies for all tables');
    console.log('   ✓ Indexes for performance');
    console.log('\n🎉 Business storefront feature is now ready!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if your Supabase project is online');
    console.error('   2. Verify SUPABASE_SERVICE_ROLE key has admin permissions');
    console.error('   3. Try running the SQL manually in Supabase SQL Editor:');
    console.error(`      https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql/new\n`);
    return false;
  }
}

// Alternative: Direct SQL execution via REST API
async function runMigrationDirect() {
  try {
    console.log('Attempting direct SQL execution...\n');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('✅ Migration successful!\n');
    return true;
  } catch (error) {
    console.error('❌ Direct execution failed:', error.message);
    return false;
  }
}

// Run migration with fallback
console.log('⏳ Executing migration...\n');

const success = await runMigration();

if (!success) {
  console.log('\n📝 Manual execution required:');
  console.log(`   1. Open: https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql/new`);
  console.log(`   2. Copy contents of: ${sqlPath}`);
  console.log('   3. Paste and run in the SQL Editor\n');
  process.exit(1);
}
