# Complete Auth Reset Instructions

Your browser session is stuck. Follow these steps **in order**:

## Step 1: Clear Browser Data
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear storage** or:
   - Expand "Local Storage" → Delete all
   - Expand "Session Storage" → Delete all
   - Expand "Cookies" → Delete all for localhost
4. Close DevTools

## Step 2: Hard Refresh
- Chrome/Edge: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Firefox: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)

## Step 3: Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
# Then restart it:
npm run dev
```

## Step 4: Test Login Flow
1. Go to `http://localhost:3000/auth/logout`
2. Wait for redirect to login page
3. Log in with your admin credentials
4. Check if header shows your correct username

## Step 5: Verify Profile in Database
Run this in Supabase SQL Editor to see all profiles:
```sql
SELECT id, name, email FROM public.profiles;
```

Make sure your account shows the correct name, not "Demo Seller".

## If name is wrong in database:
```sql
-- Update your profile name (replace with your actual email and desired name)
UPDATE public.profiles 
SET name = 'YourCorrectName' 
WHERE email = 'your-email@example.com';
```

## Check Admin Status:
```sql
SELECT p.name, p.email, a.id as admin_id
FROM public.profiles p
LEFT JOIN public.admins a ON p.id = a.id
WHERE p.email = 'your-email@example.com';
```

If `admin_id` is NULL, run:
```sql
INSERT INTO public.admins (id)
SELECT id FROM public.profiles WHERE email = 'your-email@example.com';
```
