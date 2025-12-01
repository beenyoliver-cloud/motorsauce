#!/bin/bash
# Apply garage database migration to Supabase

echo "🚗 Applying garage_vehicles migration..."

# Check if SUPABASE_URL and SUPABASE_SERVICE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment"
  echo "📝 Attempting to read from .env.local..."
  
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
  else
    echo "❌ .env.local not found. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
  fi
fi

# Read the SQL file
SQL_CONTENT=$(cat sql/create_garage_vehicles.sql)

# Execute via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Migration applied successfully!"
else
  echo "⚠️  API method not available. Applying via psql if available..."
  
  # Extract database connection details
  DB_URL=$(echo $DATABASE_URL 2>/dev/null || echo $SUPABASE_DB_URL 2>/dev/null)
  
  if [ -n "$DB_URL" ]; then
    psql "$DB_URL" -f sql/create_garage_vehicles.sql
    echo "✅ Migration applied via psql"
  else
    echo ""
    echo "📋 Please run this SQL manually in Supabase SQL Editor:"
    echo "   https://app.supabase.com/project/_/sql"
    echo ""
    cat sql/create_garage_vehicles.sql
  fi
fi
