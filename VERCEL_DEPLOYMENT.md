# 🚀 Vercel Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Go to Vercel
1. Visit **https://vercel.com**
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**

### Step 2: Import Your Repository
1. Once logged in, click **"Add New..."** → **"Project"**
2. Find **`motorsauce`** in your repository list
3. Click **"Import"**

### Step 3: Configure Project
Vercel will auto-detect Next.js. Keep these settings:

```
Framework Preset: Next.js
Root Directory: ./
Build Command: next build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
```

### Step 4: Add Environment Variables
Click **"Environment Variables"** and add these:

#### Required (Critical):
```bash
NEXT_PUBLIC_SUPABASE_URL
Value: https://your-project.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SUPABASE_SERVICE_ROLE
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ADMIN_API_KEY
Value: your-secure-random-string-here
```

#### Optional:
```bash
LISTINGS_USE_SERVICE_ROLE
Value: 1

NEXT_PUBLIC_SITE_URL
Value: (leave empty, auto-detected from Vercel)
```

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: **`https://motorsauce.vercel.app`**

---

## 🔧 Where to Find Your Supabase Keys

1. Go to **https://supabase.com/dashboard**
2. Select your **motorsauce** project
3. Click **Settings** (gear icon) → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE` (click "Reveal" first)

---

## ✅ After Deployment

### Test Your Site:
1. Visit your Vercel URL (e.g., `https://motorsauce.vercel.app`)
2. **Check listings load** (homepage should show vehicles)
3. **Test login** (should work quickly)
4. **Send a message** (messaging system should work)

### If Something Breaks:
1. Go to Vercel Dashboard → Your Project → **"Deployments"**
2. Click latest deployment → **"Functions"** tab
3. Check logs for errors
4. Most common issue: Missing environment variables

---

## 🌐 Custom Domain (Optional)

### Add Your Domain:
1. In Vercel Dashboard → Your Project → **"Settings"** → **"Domains"**
2. Enter your domain (e.g., `motorsauce.com`)
3. Follow DNS instructions from your domain provider
4. Vercel auto-provisions SSL certificate

---

## 🔄 Automatic Deployments

**Every time you push to GitHub:**
- Vercel automatically deploys
- Takes 2-3 minutes
- No manual steps needed

**To push new changes:**
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically deploy the new version!

---

## 📊 Monitor Your Site

### Production Dashboard:
- **https://vercel.com/dashboard**
- View analytics, logs, and performance
- See deployment history
- Monitor errors in real-time

---

## 🎯 Next Steps After Deployment

1. **Test messaging system** (use `MESSAGING_TESTING_GUIDE.md`)
2. **Update Supabase redirect URLs**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to **Redirect URLs**:
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/**`
3. **Run security audit** (use `scripts/test-security.sh`)

---

## 🚨 Troubleshooting

### "Cannot connect to database"
→ Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars

### "Login redirect fails"
→ Add Vercel URL to Supabase redirect URLs (see above)

### "Messages not sending"
→ Check browser console for errors, verify RLS policies in Supabase

### "Build failed"
→ Check Vercel build logs, likely TypeScript error or missing dependency

---

## 💡 Pro Tips

1. **Preview Deployments**: Every branch gets its own preview URL
2. **Rollback**: Click any previous deployment → "Promote to Production"
3. **Environment Variables**: Can update without redeploying (just redeploy after)
4. **Analytics**: Free analytics in Vercel Dashboard

---

## ✨ Your Site is Live!

Once deployed, your motorsauce marketplace is production-ready with:
- ✅ Fixed messaging system (no race conditions)
- ✅ eBay-style mark as unread
- ✅ Weekly popular sellers API
- ✅ Security audit passed (A- rating)
- ✅ Mobile responsive
- ✅ SSL certificate (automatic)
- ✅ CDN (global edge network)

**Congratulations! 🎉**
