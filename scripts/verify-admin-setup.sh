#!/bin/bash
# Admin Access Setup Verification Script
# This script helps verify if your admin access is properly configured

set -e

echo "🔍 Motorsauce Admin Access Verification"
echo "======================================="
echo ""

# Check if we're in the motorsauce directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in motorsauce directory"
    echo "Please run this script from the root of the motorsauce project"
    exit 1
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "You may need to set up environment variables"
else
    echo "✓ .env.local found"
    
    # Check for service role key locally
    if grep -q "SUPABASE_SERVICE_ROLE" .env.local; then
        echo "✓ SUPABASE_SERVICE_ROLE_KEY found in .env.local"
        SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2)
        if [ -z "$SERVICE_KEY" ]; then
            echo "⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY is empty"
        else
            echo "  Key length: ${#SERVICE_KEY} characters"
        fi
    else
        echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
        echo "   You need to add it from Supabase Settings > API > Service role key"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1️⃣  Make sure SUPABASE_SERVICE_ROLE_KEY is in your .env.local"
echo "   From Supabase > Settings > API > Service role key"
echo ""
echo "2️⃣  Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables:"
echo "   • Go to Vercel > motorsauce project > Settings"
echo "   • Environment Variables"
echo "   • Add SUPABASE_SERVICE_ROLE_KEY with the value from .env.local"
echo "   • Select: Production, Preview, Development"
echo ""
echo "3️⃣  Redeploy on Vercel (usually automatic after env var change)"
echo ""
echo "4️⃣  Run the simplified RLS policy in Supabase:"
echo "   • Supabase > SQL Editor > New Query"
echo "   • Copy contents of: sql/simplify_admins_rls.sql"
echo "   • Execute"
echo ""
echo "5️⃣  Test the admin endpoint:"
echo "   • Visit: https://yourdomain.com/api/debug-admin"
echo "   • You should see isAdmin: true (if you're an admin)"
echo ""
echo "6️⃣  Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+F5)"
echo "   • Admin Tools should now appear in the footer"
echo ""
echo "✅ For detailed help, see: ADMIN_ACCESS_TROUBLESHOOTING.md"
