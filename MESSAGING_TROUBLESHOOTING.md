# Messaging System Troubleshooting Guide

## Issue: "Unable to start conversation"

### ✅ Verified
- Database schema is correct (participant_1_id, participant_2_id columns exist)
- All messaging tables exist (threads, messages, offers, thread_deletions, thread_read_status)
- Improved error messages deployed to show specific errors

### 🔍 Diagnosis Steps

#### Step 1: Check Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Try clicking "Message" on someone's profile
4. Look for error messages starting with:
   - `[messagesClient]` - Client-side errors
   - `[threads API POST]` - Server-side errors
   - `ProfileActions:` - Component errors

#### Step 2: Common Issues & Solutions

**Error: "Cannot create thread with yourself"**
- **Cause**: Trying to message your own profile
- **Solution**: This is expected behavior - you can't message yourself

**Error: "No authorization header" or "Not authenticated"**
- **Cause**: User session expired or not logged in properly
- **Solution**: Log out and log back in

**Error: "peerId is required"**
- **Cause**: Profile missing user ID (database issue)
- **Solution**: Check that the profile exists in the `profiles` table

**Error: "Failed to create thread: [RLS error]"**
- **Cause**: Row Level Security policy blocking thread creation
- **Solution**: Check RLS policies on `threads` table

**Error: "Failed to create thread: 23505" or "duplicate key value"**
- **Cause**: Unique constraint violation (thread already exists)
- **Solution**: This shouldn't show to users, but means thread exists - might be a soft-deleted thread

#### Step 3: Verify RLS Policies

Run this in Supabase SQL Editor to check if RLS policies are working:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'threads';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'threads';
```

Expected policies:
1. `Users can view their own threads` (SELECT)
2. `Users can create threads they participate in` (INSERT)
3. `Users can update their threads` (UPDATE)

#### Step 4: Test Thread Creation Manually

Run this in Supabase SQL Editor (replace UUIDs with real user IDs):

```sql
-- Get two real user IDs
SELECT id, name FROM profiles LIMIT 2;

-- Try creating a thread manually (replace UUID values)
INSERT INTO threads (participant_1_id, participant_2_id, listing_ref, last_message_text, last_message_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Replace with user 1 ID (smaller UUID)
  'ffffffff-ffff-ffff-ffff-ffffffffffff',  -- Replace with user 2 ID (larger UUID)
  NULL,
  'Test thread',
  NOW()
);

-- If this works, the issue is authentication-related
-- If this fails, there's a database constraint or policy issue
```

### 📊 Get Detailed Error Info

After the latest deployment completes, the error messages will show:
- **Specific HTTP status codes** (401, 403, 500, etc.)
- **Exact error messages** from the database
- **Which step failed** (auth, validation, database insert)

### 🔧 Quick Fixes

**If nothing works:**
1. Clear browser cache and cookies
2. Log out and log back in
3. Try in an incognito/private window
4. Check if the other user's profile loads correctly

**If still failing:**
1. Check Supabase logs (Dashboard → Logs)
2. Look for API errors in the Network tab
3. Verify both users exist in the `profiles` table
4. Check if there are any database triggers that might be failing

### 📝 Report Issue

If the problem persists, provide:
1. **Exact error message** from browser console
2. **User IDs** involved (from and to)
3. **Supabase logs** from the time of the error
4. **Whether you can message some users but not others**
