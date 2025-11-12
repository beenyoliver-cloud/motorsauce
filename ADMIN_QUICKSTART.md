# 🛠️ ADMIN DASHBOARD - QUICK START

## ⚡ 3-Step Setup

### 1️⃣ Run SQL (2 minutes)
```
1. Open: https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo
2. Click: SQL Editor → New Query
3. Paste: sql/setup_admin_dashboard.sql
4. Run: Cmd/Ctrl + Enter
```

### 2️⃣ Clear Session (30 seconds)
```
1. Log out
2. F12 → Application → Local Storage → Clear All
3. Close DevTools
```

### 3️⃣ Login & Access (1 minute)
```
1. Go to: /auth/login
2. Login as: admin@motorsource.dev
3. Look for: "Admin" link in header
4. Click: Admin → Dashboard
```

## ✅ What You'll See

The dashboard displays three key metrics:
- 📦 **Total Parts Listed** (yellow)
- 👥 **Total Users** (blue)  
- 💰 **Total Sales** (green)

## 🚨 Troubleshooting

**No Admin link?**
- Check browser console for `[isAdmin]` logs
- Clear localStorage and re-login
- Verify SQL ran successfully

**Access denied?**
- Run the SQL script again
- Make sure you're logged in as admin@motorsource.dev
- Check admins table: `SELECT * FROM public.admins;`

## 📍 URLs
- Dashboard: http://localhost:3000/admin/dashboard
- Debug page: http://localhost:3000/admin/debug
- Login: http://localhost:3000/auth/login

---
See `ADMIN_SETUP.md` for detailed instructions
