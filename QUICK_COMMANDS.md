# Quick Command Reference - Investor Demo

## 🚀 Essential Commands

### Run Security Tests
```bash
cd /Users/oliverbeeny/Documents/motorsauce
./scripts/test-security.sh
```

### Start Development Server
```bash
npm run dev
# Then open: http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

### Test Specific Endpoint
```bash
# Weekly popular sellers (NEW)
curl http://localhost:3000/api/popular-sellers-weekly

# Listings
curl http://localhost:3000/api/listings

# Popular sellers
curl http://localhost:3000/api/popular-sellers
```

---

## 📊 Supabase SQL Queries

### Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Check Profile Visits Data
```sql
SELECT COUNT(*) FROM profile_visits;
```

### Add Test Profile Visits
```sql
INSERT INTO profile_visits (seller_id, visited_at)
SELECT id, NOW() - INTERVAL '1 day' * floor(random() * 7)
FROM profiles LIMIT 20;
```

### View Popular Sellers (Last 7 Days)
```sql
SELECT seller_id, COUNT(*) as visits
FROM profile_visits
WHERE visited_at >= NOW() - INTERVAL '7 days'
GROUP BY seller_id
ORDER BY visits DESC
LIMIT 10;
```

---

## 📁 Key Files Quick Access

```bash
# View security audit
cat SECURITY_AUDIT_REPORT.md

# View demo checklist
cat INVESTOR_DEMO_CHECKLIST.md

# View summary
cat DEMO_READY_SUMMARY.md

# View API implementation
cat src/app/api/popular-sellers-weekly/route.ts
```

---

## 🔍 Debugging Commands

### Check Environment Variables
```bash
cat .env.local | grep SUPABASE
```

### View Logs
```bash
# Development logs
npm run dev

# Check for errors
grep -r "error" .next/
```

### Test API with Authentication
```bash
# Get your auth token from browser dev tools (Application > Cookies > sb-access-token)
TOKEN="your-token-here"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/messages/threads
```

---

## 📦 Deployment Commands

### Deploy to Vercel
```bash
vercel
# Or
vercel --prod
```

### Set Environment Variables on Vercel
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🎯 Demo Sequence

### 1. Pre-Demo Setup (5 min before)
```bash
# 1. Run security tests
./scripts/test-security.sh

# 2. Start dev server
npm run dev

# 3. Open in browser
open http://localhost:3000
```

### 2. During Demo
1. **Homepage** - Show popular sellers
2. **Search** - Search for "BMW"
3. **Listing** - Click a listing
4. **Messaging** - Log in and show messages
5. **API** - Show API response in terminal

### 3. API Demo Commands
```bash
# Terminal 1: Show API responses
curl http://localhost:3000/api/popular-sellers-weekly | jq

# Terminal 2: Dev server running
npm run dev
```

---

## ⚡ Emergency Quick Fixes

### If Popular Sellers Empty
```sql
-- Run in Supabase SQL Editor
INSERT INTO profile_visits (seller_id, visited_at)
SELECT id, NOW() - INTERVAL '1 day' * floor(random() * 7)
FROM profiles LIMIT 20;
```

### If Dev Server Won't Start
```bash
# Clear Next.js cache
rm -rf .next
npm install
npm run dev
```

### If Database Connection Fails
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify in .env.local
cat .env.local
```

---

## 📞 Quick Links

- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Security Report:** `SECURITY_AUDIT_REPORT.md`
- **Demo Checklist:** `INVESTOR_DEMO_CHECKLIST.md`

---

## ✅ Pre-Demo Checklist (Copy/Paste)

```
[ ] Run ./scripts/test-security.sh
[ ] Verify RLS in Supabase
[ ] Test npm run dev
[ ] Test all API endpoints
[ ] Check browser console for errors
[ ] Prepare backup demo
[ ] Review talking points
[ ] Set up dual monitors (code + demo)
```

---

**Last Updated:** 1 December 2025  
**Status:** 🟢 Ready for Demo
