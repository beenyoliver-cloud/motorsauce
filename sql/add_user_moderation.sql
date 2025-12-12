-- Add user moderation fields to profiles table
-- Run this in Supabase SQL Editor

-- Add ban/suspend fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMPTZ;

-- Create index for quick banned user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(is_suspended) WHERE is_suspended = TRUE;

-- Create moderation log table for audit trail
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'ban', 'unban', 'suspend', 'unsuspend', 'warn', 'note'
  reason TEXT,
  details JSONB, -- Additional context like suspension duration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on moderation logs
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user ON public.moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON public.moderation_logs(created_at DESC);

-- Enable RLS on moderation_logs
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read moderation logs
CREATE POLICY "Admins can view moderation logs"
ON public.moderation_logs
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- Only admins can insert moderation logs
CREATE POLICY "Admins can create moderation logs"
ON public.moderation_logs
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- Function to check if a user is banned or suspended
CREATE OR REPLACE FUNCTION public.is_user_active(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT is_banned, is_suspended, suspended_until
  INTO user_record
  FROM public.profiles
  WHERE id = check_user_id;
  
  IF user_record IS NULL THEN
    RETURN TRUE; -- User not found, allow (will fail elsewhere)
  END IF;
  
  -- Check if banned
  IF user_record.is_banned = TRUE THEN
    RETURN FALSE;
  END IF;
  
  -- Check if suspended and suspension still active
  IF user_record.is_suspended = TRUE THEN
    IF user_record.suspended_until IS NULL OR user_record.suspended_until > NOW() THEN
      RETURN FALSE;
    ELSE
      -- Suspension expired, auto-unsuspend
      UPDATE public.profiles
      SET is_suspended = FALSE, suspended_until = NULL
      WHERE id = check_user_id;
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Enhanced admin metrics function
CREATE OR REPLACE FUNCTION public.get_enhanced_admin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_listings', (SELECT COUNT(*) FROM public.listings WHERE status = 'active'),
    'total_sales', (SELECT COUNT(*) FROM public.orders WHERE status = 'completed'),
    'revenue_total', (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM public.orders WHERE status = 'completed'),
    
    -- Today's stats
    'users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'listings_today', (SELECT COUNT(*) FROM public.listings WHERE created_at >= CURRENT_DATE),
    'sales_today', (SELECT COUNT(*) FROM public.orders WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    'revenue_today', (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM public.orders WHERE status = 'completed' AND created_at >= CURRENT_DATE),
    
    -- This week's stats
    'users_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'listings_week', (SELECT COUNT(*) FROM public.listings WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'sales_week', (SELECT COUNT(*) FROM public.orders WHERE status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    'revenue_week', (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM public.orders WHERE status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)),
    
    -- This month's stats
    'users_month', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'listings_month', (SELECT COUNT(*) FROM public.listings WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'sales_month', (SELECT COUNT(*) FROM public.orders WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    'revenue_month', (SELECT COALESCE(SUM(total_cents), 0) / 100.0 FROM public.orders WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    
    -- Moderation stats
    'pending_reports', (SELECT COUNT(*) FROM public.user_reports WHERE status = 'pending'),
    'banned_users', (SELECT COUNT(*) FROM public.profiles WHERE is_banned = TRUE),
    'suspended_users', (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = TRUE AND (suspended_until IS NULL OR suspended_until > NOW())),
    
    -- Listing stats by status
    'active_listings', (SELECT COUNT(*) FROM public.listings WHERE status = 'active'),
    'draft_listings', (SELECT COUNT(*) FROM public.listings WHERE status = 'draft'),
    'sold_listings', (SELECT COUNT(*) FROM public.listings WHERE status = 'sold')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Get top sellers function
CREATE OR REPLACE FUNCTION public.get_top_sellers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  total_listings BIGINT,
  total_sales BIGINT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name,
    p.email,
    p.avatar_url,
    (SELECT COUNT(*) FROM public.listings l WHERE l.seller_id = p.id) as total_listings,
    (SELECT COUNT(*) FROM public.orders o WHERE o.seller_id = p.id AND o.status = 'completed') as total_sales,
    (SELECT COALESCE(SUM(o.total_cents), 0) / 100.0 FROM public.orders o WHERE o.seller_id = p.id AND o.status = 'completed') as total_revenue
  FROM public.profiles p
  ORDER BY total_sales DESC, total_revenue DESC
  LIMIT limit_count;
END;
$$;

-- Get recent activity feed
CREATE OR REPLACE FUNCTION public.get_admin_activity_feed(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  activity_type TEXT,
  activity_id TEXT,
  user_id UUID,
  user_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  (
    -- New users
    SELECT 
      'new_user'::TEXT as activity_type,
      p.id::TEXT as activity_id,
      p.id as user_id,
      p.name as user_name,
      'New user registered'::TEXT as description,
      p.created_at
    FROM public.profiles p
    ORDER BY p.created_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    -- New listings
    SELECT 
      'new_listing'::TEXT as activity_type,
      l.id::TEXT as activity_id,
      l.seller_id as user_id,
      COALESCE(p.name, 'Unknown') as user_name,
      ('Listed: ' || l.title)::TEXT as description,
      l.created_at
    FROM public.listings l
    LEFT JOIN public.profiles p ON p.id = l.seller_id
    ORDER BY l.created_at DESC
    LIMIT limit_count
  )
  UNION ALL
  (
    -- New reports
    SELECT 
      'new_report'::TEXT as activity_type,
      r.id::TEXT as activity_id,
      r.reporter_id as user_id,
      COALESCE(p.name, 'Unknown') as user_name,
      ('Report: ' || r.reason)::TEXT as description,
      r.created_at
    FROM public.user_reports r
    LEFT JOIN public.profiles p ON p.id = r.reporter_id
    ORDER BY r.created_at DESC
    LIMIT limit_count
  )
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$;

COMMENT ON TABLE public.moderation_logs IS 'Audit trail for all admin moderation actions';
COMMENT ON COLUMN public.profiles.is_banned IS 'Whether user is permanently banned';
COMMENT ON COLUMN public.profiles.is_suspended IS 'Whether user is temporarily suspended';
COMMENT ON COLUMN public.profiles.suspended_until IS 'When suspension ends (NULL = indefinite)';
