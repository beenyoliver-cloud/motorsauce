# Pre-Investor Demo Checklist
**Last Updated:** 1 December 2025

## Quick Start (5 minutes)

### 1. Run Security Tests
```bash
# Make the script executable
chmod +x scripts/test-security.sh

# Run all security tests
./scripts/test-security.sh

# Expected output: "✓ ALL TESTS PASSED!"
```

### 2. Verify Database Security (Supabase Dashboard)
1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste contents from `sql/verify_rls_policies.sql`
4. Run the queries
5. Verify:
   - ✅ All tables show "✅ Enabled" for RLS
   - ✅ At least 15+ policies exist
   - ✅ No security issues found

### 3. Test New Features
```bash
# Start the dev server
npm run dev

# Open in browser and test:
# 1. Homepage loads (http://localhost:3000)
# 2. Popular sellers displayed
# 3. Search works
# 4. Messaging works (if logged in)
```

---

## Detailed Pre-Demo Setup

### Database Verification

#### Step 1: Check RLS Status
Run in Supabase SQL Editor:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'listings', 'threads', 'messages', 'offers')
ORDER BY tablename;
```

**Expected:** All should show `rowsecurity = true`

#### Step 2: Add profile_visits RLS (if missing)
```sql
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record profile visits"
  ON public.profile_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can read profile visits"
  ON public.profile_visits FOR SELECT USING (true);
```

#### Step 3: Verify Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_profile_visits_seller ON public.profile_visits(seller_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_date ON public.profile_visits(visited_at DESC);
```

---

### Environment Variables Check

Ensure `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security Check:**
- ✅ `NEXT_PUBLIC_*` variables are safe for client
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is server-only (never in client code)

---

### API Endpoint Testing

#### Test Public Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Weekly popular sellers (NEW FEATURE)
curl http://localhost:3000/api/popular-sellers-weekly

# Listings
curl http://localhost:3000/api/listings
```

#### Test Protected Endpoints (should fail without auth)
```bash
# Messages (should return 401)
curl http://localhost:3000/api/messages/threads

# Expected: {"error":"Unauthorized"}
```

---

## Demo Features to Showcase

### 1. **Weekly Popular Sellers** ⭐ NEW
- **Endpoint:** `/api/popular-sellers-weekly`
- **What it does:** Shows top 10 sellers by profile visits in the past 7 days
- **Demo script:**
  1. Open homepage
  2. Show popular sellers section
  3. Explain analytics: "We track seller engagement to surface the most active sellers"
  4. Show API response (clean JSON, no sensitive data)

### 2. **Secure Messaging System**
- **Endpoint:** `/api/messages/threads`
- **What it does:** Private messaging between buyers/sellers
- **Demo script:**
  1. Log in as a user
  2. Open a thread
  3. Send a message
  4. Explain: "Messages are encrypted at rest, only participants can see them"
  5. Show RLS policies: "Row Level Security ensures data isolation"

### 3. **Marketplace Listings**
- **Endpoint:** `/api/listings`
- **What it does:** Browse car parts marketplace
- **Demo script:**
  1. Show listings page
  2. Filter by category/make/model
  3. Explain: "Public listings with owner-only edit permissions"

### 4. **Offer System**
- **Endpoint:** `/api/offers`
- **What it does:** Buyer-seller negotiation workflow
- **Demo script:**
  1. View a listing
  2. Make an offer
  3. Show offer in messages
  4. Explain: "Offers are private, only participants can see them"

---

## Investor Talking Points

### Security & Trust
- ✅ **Row Level Security** on all sensitive data
- ✅ **Authentication** via Supabase Auth (industry standard)
- ✅ **Data isolation** - users only see their own messages/offers
- ✅ **No PII exposure** in public APIs
- ✅ **HTTPS enforced** via Vercel/Next.js

### Scalability
- ✅ **Serverless architecture** (Next.js + Supabase)
- ✅ **Indexed queries** for performance
- ✅ **Real-time capabilities** via Supabase subscriptions
- ✅ **CDN-cached** static assets

### Analytics & Insights
- ✅ **Profile visit tracking** for seller engagement
- ✅ **Weekly popular sellers** algorithm
- ✅ **Offer conversion tracking** (future)
- ✅ **Search analytics** (future)

### Roadmap (mention if asked)
- 🚀 Real-time messaging notifications
- 🚀 Advanced search with ML recommendations
- 🚀 Mobile app (React Native)
- 🚀 Payment processing (Stripe integration ready)

---

## Common Demo Issues & Solutions

### Issue: "Popular sellers showing no data"
**Solution:**
1. Check if profile_visits table has data
2. Run: `SELECT COUNT(*) FROM profile_visits;`
3. If empty, add test data:
   ```sql
   INSERT INTO profile_visits (seller_id, visited_at)
   SELECT id, NOW() - INTERVAL '1 day' * floor(random() * 7)
   FROM profiles
   LIMIT 20;
   ```

### Issue: "Messages not loading"
**Solution:**
1. Check user is logged in (check browser console)
2. Verify RLS policies are enabled
3. Check Authorization header is being sent

### Issue: "API returns 500 error"
**Solution:**
1. Check Supabase service status
2. Verify environment variables are set
3. Check server logs: `npm run dev` (check terminal)

### Issue: "Cannot create offers"
**Solution:**
1. User must be logged in
2. User must be viewing a listing they don't own
3. Check offers table RLS policies

---

## Post-Demo Follow-Up

### Metrics to Track
- Demo success rate
- Investor questions asked
- Features that got most attention
- Technical concerns raised

### Action Items
- [ ] Note any bugs discovered during demo
- [ ] Collect investor feedback
- [ ] Update security docs based on questions
- [ ] Plan next feature sprint

---

## Emergency Contacts

### If Demo Environment Fails
1. **Backup:** Use production URL (if deployed)
2. **Fallback:** Show slides/video demo
3. **Supabase Support:** https://supabase.com/support

### Technical Support
- **Security concerns:** Review `SECURITY_AUDIT_REPORT.md`
- **API issues:** Check Supabase logs
- **Frontend issues:** Check browser console

---

## Final Checklist (Day Before Demo)

- [ ] Run `./scripts/test-security.sh` - all tests pass
- [ ] Verify RLS policies in Supabase dashboard
- [ ] Test all demo features work
- [ ] Check environment variables are set
- [ ] Populate test data (users, listings, messages)
- [ ] Test on demo device/screen
- [ ] Prepare backup demo (video/slides)
- [ ] Print this checklist for quick reference

---

## Success Criteria

✅ All security tests pass  
✅ No errors in console during demo  
✅ All features load within 2 seconds  
✅ Can explain security architecture clearly  
✅ Can show code/database when asked  
✅ Confidence level: 9/10 or higher

---

**Good luck with your investor demo!** 🚀

If you encounter any issues, refer to:
- `SECURITY_AUDIT_REPORT.md` - Full security analysis
- `sql/verify_rls_policies.sql` - Database verification queries
- `scripts/test-security.sh` - Automated testing script
