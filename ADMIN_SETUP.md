# Admin Dashboard Setup Guide

## Current Status
- ✅ Admin dashboard page exists at `/admin/dashboard`
- ✅ Admin API endpoint exists at `/api/admin-metrics`
- ✅ Admin check logic in Header component
- ✅ Middleware protecting `/admin` routes
- ✅ `admins` table exists in database
- ⏸️ Need to set up admin user account

## Quick Setup Steps

### 1. Run the SQL Script

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of `sql/setup_admin_dashboard.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Verify you see the output showing the admin status as "✓ IS ADMIN"

### 2. Clear Your Session

1. **Log out** from your current session (click profile > Log out)
2. Open browser DevTools (F12 or right-click > Inspect)
3. Go to **Application** tab
4. Find **Local Storage** in the left sidebar
5. Click on `http://localhost:3000`
6. Click **Clear All** or delete the storage items
7. Close DevTools

### 3. Log In as Admin

1. Go to http://localhost:3000/auth/login
2. Log in with:
   - **Email:** `admin@motorsource.dev`
   - **Password:** (whatever the current password is for the Admin account)
3. After logging in, you should see an **"Admin"** link in the header navigation
4. Click it to access the admin dashboard

### 4. Verify Dashboard Works

You should now see:
- Total Parts Listed
- Total Users Registered  
- Total Sales Made

## Troubleshooting

### Admin Link Not Appearing
- Check browser console (F12 > Console) for any `[isAdmin]` log messages
- Make sure you're logged in with the correct account
- Try refreshing the page
- Clear localStorage and log in again

### Dashboard Shows "Unauthorized"
- Verify the SQL script ran successfully
- Check that the user appears in the admins table:
  ```sql
  SELECT * FROM public.admins;
  ```

### Can't Access Dashboard
- Check that middleware is running (should see it in terminal logs)
- Verify you're accessing `/admin/dashboard` not `/profile/Admin/dashboard`

## What the Admin Dashboard Shows

The admin dashboard displays:
1. **Total Parts Listed** - Count of all listings in the database
2. **Total Users Registered** - Count of all user profiles
3. **Total Sales Made** - Count of accepted/completed offers

The metrics are fetched from the `/api/admin-metrics` endpoint which queries the database in real-time.
