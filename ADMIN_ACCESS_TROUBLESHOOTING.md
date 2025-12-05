# Admin Tools Access Troubleshooting Guide

## Current Issue
Admin tools are not appearing in the footer/header UI despite:
- User being logged in ✓
- User being in admins table ✓
- Backend authentication working ✓

## Root Cause Analysis

The admin status check happens in this flow:
1. **Frontend Component** (Header.tsx/Footer.tsx) calls `isAdmin()` on mount and on `ms:auth` events
2. **Admin Check Function** (lib/admin.ts) calls `/api/is-admin` endpoint with Bearer token
3. **API Endpoint** (/api/is-admin/route.ts) tries to verify admin status:
   - **Primary method**: Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
   - **Fallback method**: Uses auth token with RLS policies

**Most likely problem**: `SUPABASE_SERVICE_ROLE_KEY` is NOT set in Vercel environment variables, causing the fallback to RLS, which has permission issues.

## Step 1: Check Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your "motorsauce" project
3. Click "Settings" → "Environment Variables"
4. Look for `SUPABASE_SERVICE_ROLE_KEY`
   - If **NOT present**: You need to add it
   - If **present**: Skip to Step 2

### How to Add SUPABASE_SERVICE_ROLE_KEY to Vercel

1. Get your service role key from Supabase:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Click "Settings" → "API"
   - Find "Service role key" under "Project API keys"
   - Copy this key (⚠️ Keep it secret!)

2. Add to Vercel:
   - Back in Vercel project settings
   - Click "Add Environment Variable"
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste the key from step 1)
   - Select environments: Production, Preview, Development
   - Click "Save"

3. Redeploy:
   - Vercel should auto-redeploy, but if not: click "Deployments" → "Redeploy" on latest

## Step 2: Verify RLS Policies on admins Table

Run this SQL in Supabase SQL Editor to simplify the RLS policies:

```sql
-- Simplified admins RLS policy that actually works
-- The issue: The original policies were too restrictive
-- Solution: Use a simple permissive policy for SELECT

DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can add admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can remove admins" ON public.admins;

-- Single simple policy: Anyone can see admins table (it's not sensitive data)
-- The actual security is enforced by the admins table - you have to be added to it
CREATE POLICY "Public read access to admins"
  ON public.admins
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can add admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE id = auth.uid()
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can remove admins"
  ON public.admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE id = auth.uid()
    )
  );

SELECT 'Admins table RLS simplified successfully!' as status;
```

## Step 3: Test the Admin Status Endpoint

Once Vercel has redeployed with the new environment variable:

### Option A: Use the Debug Endpoint
1. Go to: `https://yourdomain.com/api/debug-admin`
2. Browser will prompt for login (or use your current session)
3. Response should show:
```json
{
  "timestamp": "...",
  "environment": {
    "hasPublicUrl": true,
    "hasPublicKey": true,
    "hasServiceKey": true    // ← This should be TRUE after adding env var
  },
  "user": {
    "id": "your-user-id",
    "email": "your-email@example.com"
  },
  "adminCheck": {
    "method": "service_role",  // ← Should be "service_role" not "rls_fallback"
    "success": true,
    "isAdmin": true            // ← This should be TRUE if you're an admin
  }
}
```

### Option B: Check Browser Console
1. Log in as admin user on your local app
2. Open DevTools (F12) → Console tab
3. You should see logs like:
```
[isAdmin] Checking admin status for user: abc-123 user@example.com
[isAdmin] Calling /api/is-admin endpoint
[isAdmin] API response status: 200 OK
[isAdmin] API response data: {"isAdmin":true}
[isAdmin] Final result: true
```

If you see errors, they'll help diagnose the issue.

## Step 4: Verify Admin Tools Appear

After deploying with SUPABASE_SERVICE_ROLE_KEY set:

1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+F5 on Windows)
2. Log in as an admin user
3. Check:
   - ✓ Footer should show "🛠️ Admin Tools" link
   - ✓ Header profile dropdown should show "Admin" option
   - ✓ Should be able to navigate to `/admin/dashboard`

## Troubleshooting Checklist

- [ ] SUPABASE_SERVICE_ROLE_KEY added to Vercel environment variables
- [ ] Vercel has redeployed (should be automatic, check Deployments page)
- [ ] Hard refreshed browser (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] Console shows [isAdmin] logs with result: true
- [ ] /api/debug-admin endpoint returns isAdmin: true
- [ ] Admins table RLS policies have permissive SELECT policy
- [ ] You are in the admins table (can verify in Supabase SQL Editor)

## If Still Not Working

### Check these in order:

1. **Verify you're actually in admins table**:
```sql
SELECT * FROM public.admins WHERE id = 'your-user-id';
```
If empty, add yourself:
```sql
INSERT INTO public.admins (id) 
VALUES ('your-user-id');
```

2. **Check if service role key is valid**:
```sql
-- Run in Supabase with service role credentials
SELECT 'Service role key is valid' as status;
```

3. **Manually test the /api/is-admin endpoint**:
```bash
# Get your access token from browser -> Settings -> Copy Token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourdomain.com/api/is-admin
```

4. **Check Vercel function logs**:
   - Vercel Dashboard → Deployments → Select latest → Logs
   - Look for any errors in /api/is-admin or /api/debug-admin endpoints

## Quick Commands Reference

### View admins table in Supabase:
```sql
SELECT id, created_at FROM public.admins LIMIT 10;
```

### Check if user is admin:
```sql
SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = 'user-id');
```

### Add user as admin:
```sql
INSERT INTO public.admins (id) VALUES ('user-id');
```

### Remove user as admin:
```sql
DELETE FROM public.admins WHERE id = 'user-id';
```

## Files Modified in This Fix

- `src/lib/admin.ts` - Enhanced logging to track admin status check
- `src/app/api/is-admin/route.ts` - Already has service role support
- `src/app/api/debug-admin/route.ts` - New endpoint for debugging
- `sql/simplify_admins_rls.sql` - Simplified RLS policies (run in Supabase)

## Next Steps

1. **Immediate**: Add SUPABASE_SERVICE_ROLE_KEY to Vercel
2. **Verify**: Check /api/debug-admin endpoint confirms admin status
3. **Confirm**: Admin tools appear in UI
4. **If stuck**: Share browser console logs or /api/debug-admin response for further debugging
