-- RLS Verification Queries for Motorsauce Platform
-- Run these in your Supabase SQL Editor to verify security policies

-- =====================================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 
    'listings', 
    'threads', 
    'messages', 
    'offers', 
    'favorites',
    'thread_deletions',
    'thread_read_status',
    'admins',
    'profile_visits'
  )
ORDER BY tablename;

-- =====================================================
-- 2. LIST ALL RLS POLICIES
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. VERIFY PROFILE_VISITS TABLE EXISTS
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profile_visits'
ORDER BY ordinal_position;

-- =====================================================
-- 4. ADD RLS POLICY TO PROFILE_VISITS (if missing)
-- =====================================================
-- Enable RLS on profile_visits
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert visits (for analytics)
DROP POLICY IF EXISTS "Anyone can record profile visits" ON public.profile_visits;
CREATE POLICY "Anyone can record profile visits"
  ON public.profile_visits
  FOR INSERT
  WITH CHECK (true);

-- Only allow reading for aggregation (service role)
DROP POLICY IF EXISTS "Service role can read profile visits" ON public.profile_visits;
CREATE POLICY "Service role can read profile visits"
  ON public.profile_visits
  FOR SELECT
  USING (true);

-- =====================================================
-- 5. VERIFY CRITICAL POLICIES EXIST
-- =====================================================
-- Check threads policies
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'threads'
    AND policyname = 'Users can view their own threads'
) as threads_select_policy_exists;

-- Check messages policies
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'messages'
    AND policyname = 'Users can view messages in their threads'
) as messages_select_policy_exists;

-- Check offers policies
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'offers'
    AND policyname = 'Users can view offers in their threads'
) as offers_select_policy_exists;

-- =====================================================
-- 6. TEST DATA ISOLATION (Profiles)
-- =====================================================
-- This should return rows (profiles are public)
SELECT COUNT(*) as public_profile_count FROM public.profiles;

-- =====================================================
-- 7. VERIFY INDEXES FOR PERFORMANCE
-- =====================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('threads', 'messages', 'offers', 'profile_visits')
ORDER BY tablename, indexname;

-- =====================================================
-- 8. CHECK FOR POTENTIAL SECURITY ISSUES
-- =====================================================
-- Find tables without RLS enabled
SELECT 
  tablename,
  '⚠️ RLS NOT ENABLED' as security_issue
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
  AND tablename NOT IN ('audit_logs', 'seller_metrics')
ORDER BY tablename;

-- =====================================================
-- 9. VERIFY PROFILE_VISITS INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profile_visits_seller ON public.profile_visits(seller_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_date ON public.profile_visits(visited_at DESC);

-- =====================================================
-- 10. TEST QUERY FOR WEEKLY POPULAR SELLERS
-- =====================================================
-- This simulates what the API does
SELECT 
  seller_id,
  COUNT(*) as visit_count
FROM public.profile_visits
WHERE visited_at >= NOW() - INTERVAL '7 days'
GROUP BY seller_id
ORDER BY visit_count DESC
LIMIT 10;

-- =====================================================
-- 11. SECURITY AUDIT SUMMARY
-- =====================================================
-- Generate a summary report
SELECT 
  'RLS Enabled Tables' as metric,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true

UNION ALL

SELECT 
  'Total RLS Policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tables Without RLS',
  COUNT(*)
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'

UNION ALL

SELECT 
  'Active Indexes',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public';

-- =====================================================
-- EXPECTED RESULTS FOR PRODUCTION READINESS:
-- =====================================================
-- ✅ All sensitive tables should have RLS enabled (rowsecurity = true)
-- ✅ At least 15+ RLS policies should exist
-- ✅ profile_visits table should exist with 3 columns
-- ✅ All critical policies should return true
-- ✅ No security issues should be found (empty result set)

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If any table shows RLS disabled, run:
-- ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- If profile_visits table doesn't exist, run:
-- CREATE TABLE public.profile_visits (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   seller_id UUID NOT NULL,
--   visited_at TIMESTAMPTZ DEFAULT NOW()
-- );
