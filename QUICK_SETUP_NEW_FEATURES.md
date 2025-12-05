# 🚀 Quick Setup Guide - New Features

## What Was Implemented

✅ **Enhanced Password Security** - Stronger requirements with real-time validation  
✅ **Watch Parts System** - Users can watch vehicles and get notified of compatible parts  
✅ **Todo List** - Full task management with priorities and due dates  

---

## ⚡ Setup Steps (5 minutes)

### Step 1: Apply Database Migration

1. Open Supabase Dashboard: https://app.supabase.com
2. Go to **SQL Editor** → **New Query**
3. Copy the entire contents of `sql/add_watch_parts_and_todos.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Cmd+Enter)
6. Wait for "Success" message

**This creates:**
- `watched_parts` table (for vehicle watch alerts)
- `user_todos` table (for task management)
- RLS policies (security)
- Indexes (performance)
- Helper functions

---

### Step 2: Verify Deployment

1. Check Vercel dashboard: https://vercel.com/dashboard
2. Wait for build to complete (~2 minutes)
3. Look for green checkmark ✓

---

### Step 3: Test Features

#### Test Password Security
1. Navigate to `/auth/register`
2. Try weak password like "test123" → Should show errors
3. Try strong password like "MyPass123!" → Should show green checkmarks
4. Watch the strength meter update in real-time

#### Test Watch Parts
1. Login to your account
2. Add a vehicle to your garage
3. Click the bell icon on the vehicle card
4. Should see "Watch enabled" confirmation
5. Refresh page - bell should still show as enabled (yellow)

#### Test Todo List
1. Navigate to `/profile/todos`
2. Click "Add Task"
3. Enter title and optional details
4. Create task
5. Check checkbox to mark complete
6. Try editing and deleting

---

## 🎯 Quick Test Script

Run through this checklist:

```
Password Security:
□ Register page shows password strength meter
□ Weak passwords are rejected
□ Strong passwords are accepted
□ Requirements checklist shows green checks

Watch Parts:
□ Bell icon works in garage
□ Watch saves after page refresh
□ Can't watch same vehicle twice
□ Can disable watch by clicking bell again

Todo List:
□ Can access /profile/todos when logged in
□ Can create new todos
□ Can mark todos complete
□ Can edit todos inline
□ Can delete todos
□ Active/completed toggle works
```

---

## 🔍 Troubleshooting

### "Function get_watched_parts_matches does not exist"
- **Fix:** Run the SQL migration again (Step 1)

### "Table watched_parts does not exist"
- **Fix:** Run the SQL migration (Step 1)

### Password validation not showing
- **Fix:** Hard refresh the page (Cmd+Shift+R)
- **Fix:** Check browser console for errors

### Todos not loading
- **Fix:** Verify you're logged in
- **Fix:** Check Supabase logs for RLS policy issues
- **Fix:** Run SQL migration if tables missing

---

## 📝 What Changed

### New Files
```
sql/add_watch_parts_and_todos.sql          ← Database schema
src/lib/passwordValidation.ts              ← Password checker
src/app/api/watched-parts/route.ts         ← Watch API
src/app/api/todos/route.ts                 ← Todo API
src/components/TodoList.tsx                ← Todo UI
src/app/profile/todos/page.tsx             ← Todo page
NEW_FEATURES_IMPLEMENTATION.md             ← Full docs
```

### Modified Files
```
src/app/auth/register/page.tsx             ← Added password validation
src/components/GaragePartsIntegration.tsx  ← Connected to API
```

---

## 🎨 Where to Find Features

### Password Security
- **URL:** `/auth/register`
- **Visible:** Immediately when typing password
- **Effect:** Can't register with weak password

### Watch Parts
- **URL:** In garage view (wherever vehicles are displayed)
- **Visible:** Bell icon on vehicle cards
- **Effect:** Saves watch preference to database

### Todo List
- **URL:** `/profile/todos`
- **Visible:** After login, navigate directly
- **Effect:** Full task management interface

---

## 🔐 Security Notes

All features are secured with:
- **Row Level Security (RLS)** on database tables
- **Auth checks** in API routes
- **User isolation** - users only see their own data
- **Unique constraints** to prevent duplicates
- **Foreign key constraints** for data integrity

---

## 💡 Next Steps

After testing, consider:
1. Add link to todo list in profile menu
2. Show todo count badge in header
3. Add email notifications for watch parts
4. Add todo reminders for due dates

---

## 📞 Need Help?

Check the full documentation: `NEW_FEATURES_IMPLEMENTATION.md`

Common issues:
- Database migration not run → Run `sql/add_watch_parts_and_todos.sql`
- Not seeing changes → Hard refresh (Cmd+Shift+R)
- API errors → Check Vercel logs
- Database errors → Check Supabase logs
