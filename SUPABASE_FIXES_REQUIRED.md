# Supabase Database Fixes Required

## 🔴 CRITICAL: Apply SQL changes to Supabase

Your code has been updated, but the database still needs these fixes applied. **The frontend code won't work until you apply these SQL changes to your Supabase database.**

### What's broken:
1. **Offers system** - When a seller accepts/declines/counters, the buyer doesn't receive the response
   - Root cause: `respond_offer()` RPC doesn't exist in database
   
2. **Notification badge** - Updates slowly (every 30 seconds) on desktop
   - Root cause: No real-time trigger to mark thread as unread
   - Workaround: Updated frontend to use real-time subscriptions + 10s polling (better than before)

---

## ✅ Step-by-Step Supabase Fix

### 1. Open Supabase SQL Editor
- Go to: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new
- Or in Supabase dashboard: **SQL Editor** → **New Query**

### 2. Copy and Run the SQL
The complete SQL is in: `sql/fix_unread_status_trigger.sql`

**This SQL creates/updates:**

#### Function 1: `mark_thread_unread_for_recipient()`
- **Purpose**: Automatically marks a thread as unread for the recipient when a new message arrives
- **Trigger**: Runs after every message insert
- **Effect**: Deletes the recipient's read status record, which flags thread as unread
- **Result**: Unread badge updates immediately via real-time Supabase subscription

#### Function 2: `respond_offer(p_offer_id, p_status, p_counter_amount_cents)`
- **Purpose**: Handles all offer response actions (accept/decline/counter/withdraw)
- **Actions**:
  - Updates offer status in `offers` table
  - Inserts a system message to notify the other party
  - Marks the thread as unread for the recipient
  - Returns updated offer data to API
- **Status values**: `'accept'`, `'decline'`, `'counter'`, `'withdrawn'`
- **Security**: Validates user authorization before allowing actions

---

## 🚀 How to Apply

### Option A: Copy-Paste in Supabase Console (5 minutes)

1. Open: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new
2. Copy entire contents of `sql/fix_unread_status_trigger.sql`
3. Paste into SQL editor
4. Click **Run** (or press `Cmd+Enter`)
5. Verify: You should see "Success" at the bottom

### Option B: Via Terminal (if you have psql installed)

```bash
psql postgresql://YOUR_CONNECTION_STRING < sql/fix_unread_status_trigger.sql
```

---

## ✓ Verification

After applying the SQL, verify both functions exist:

```sql
-- Check functions exist
SELECT 
  n.nspname as schema,
  p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('mark_thread_unread_for_recipient', 'respond_offer')
ORDER BY p.proname;

-- Check trigger exists
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_mark_thread_unread_for_recipient';
```

Both queries should return results showing the functions/trigger are installed.

---

## 📋 What This Fixes

### Before (Current - Broken):
- ❌ Seller accepts/declines/counters → buyer never sees response
- ❌ New messages → notification badge updates after 30 seconds
- ❌ Offers system completely broken

### After (With SQL applied):
- ✅ Seller responds to offer → system message immediately sent to buyer thread
- ✅ New messages → notification badge updates in <1 second via real-time
- ✅ Offers fully functional (accept/decline/counter all work)
- ✅ Thread marked as unread for recipient automatically

---

## 🐛 If Something Goes Wrong

**Syntax Error?**
- Check that you copied the ENTIRE file including all functions
- Make sure there are no special characters

**"Function already exists"?**
- The `DROP FUNCTION IF EXISTS` and `DROP TRIGGER IF EXISTS` at the top should prevent this
- If you still get errors, drop manually first:
  ```sql
  DROP TRIGGER IF EXISTS trigger_mark_thread_unread_for_recipient ON public.messages;
  DROP FUNCTION IF EXISTS mark_thread_unread_for_recipient();
  DROP FUNCTION IF EXISTS respond_offer(UUID, TEXT, INTEGER);
  ```
  Then run the full SQL again

**Still not working after applying?**
- Hard refresh browser (Cmd+Shift+R on Mac / Ctrl+Shift+R on Windows)
- Check browser console for any API errors
- Verify RPC is being called in Supabase activity logs

---

## 📞 Questions?

Once you apply this SQL, all three issues should be fixed:
1. Offers responses will appear instantly
2. Notification badge will update in real-time
3. Mobile and desktop messaging will work properly

Let me know once you've applied it! 🚀
