-- Add user reporting system
-- Run this in Supabase SQL Editor

-- 1. Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('fraud', 'counterfeit', 'abuse', 'spam', 'other')),
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON public.user_reports(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_reports

-- Regular users can create reports about other users
CREATE POLICY "Users can create reports"
  ON public.user_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own submitted reports
CREATE POLICY "Users can view their own reports"
  ON public.user_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.user_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- Admins can update reports (change status, add notes)
CREATE POLICY "Admins can update reports"
  ON public.user_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON public.user_reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- 5. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_reports_timestamp
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reports_timestamp();

-- 6. Function to get report statistics for admins
CREATE OR REPLACE FUNCTION get_report_statistics()
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  investigating_reports BIGINT,
  resolved_reports BIGINT,
  dismissed_reports BIGINT,
  reports_last_24h BIGINT,
  reports_last_7d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_reports,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_reports,
    COUNT(*) FILTER (WHERE status = 'investigating')::BIGINT AS investigating_reports,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT AS resolved_reports,
    COUNT(*) FILTER (WHERE status = 'dismissed')::BIGINT AS dismissed_reports,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT AS reports_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::BIGINT AS reports_last_7d
  FROM public.user_reports;
END;
$$;

-- 7. Function to get reports with reporter and reported user details
CREATE OR REPLACE FUNCTION get_reports_with_details(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  report_id UUID,
  reporter_id UUID,
  reporter_name TEXT,
  reporter_email TEXT,
  reported_user_id UUID,
  reported_user_name TEXT,
  reported_user_email TEXT,
  reason TEXT,
  details TEXT,
  status TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    r.id AS report_id,
    r.reporter_id,
    p1.name AS reporter_name,
    p1.email AS reporter_email,
    r.reported_user_id,
    r.reported_user_name,
    p2.email AS reported_user_email,
    r.reason,
    r.details,
    r.status,
    r.admin_notes,
    r.reviewed_by,
    r.reviewed_at,
    r.created_at,
    r.updated_at
  FROM public.user_reports r
  LEFT JOIN public.profiles p1 ON p1.id = r.reporter_id
  LEFT JOIN public.profiles p2 ON p2.id = r.reported_user_id
  WHERE (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Verification queries
SELECT 'user_reports table created' as status, COUNT(*) as row_count FROM public.user_reports;
SELECT 'Report system ready' as status;
