-- Add admin user management view function
-- Run this in Supabase SQL Editor

-- Function to get comprehensive user data for admin management
CREATE OR REPLACE FUNCTION get_users_admin_view()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  total_listings BIGINT,
  total_sales BIGINT,
  total_reports BIGINT,
  pending_reports BIGINT,
  messages_24h BIGINT,
  last_active TIMESTAMPTZ
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
    p.id,
    p.email,
    p.name,
    p.created_at,
    p.avatar_url,
    p.bio,
    p.location,
    -- Count of active listings
    COALESCE(
      (SELECT COUNT(*)::BIGINT 
       FROM public.listings l 
       WHERE l.seller_id = p.id),
      0
    ) AS total_listings,
    -- Count of completed sales (orders)
    COALESCE(
      (SELECT COUNT(DISTINCT o.id)::BIGINT
       FROM public.orders o
       JOIN public.order_items oi ON oi.order_id = o.id
       WHERE oi.seller_id = p.id 
       AND o.status = 'confirmed'),
      0
    ) AS total_sales,
    -- Total reports against this user
    COALESCE(
      (SELECT COUNT(*)::BIGINT 
       FROM public.user_reports ur 
       WHERE ur.reported_user_id = p.id),
      0
    ) AS total_reports,
    -- Pending reports against this user
    COALESCE(
      (SELECT COUNT(*)::BIGINT 
       FROM public.user_reports ur 
       WHERE ur.reported_user_id = p.id 
       AND ur.status = 'pending'),
      0
    ) AS pending_reports,
    -- Messages sent in last 24 hours
    COALESCE(
      (SELECT COUNT(*)::BIGINT 
       FROM public.messages m 
       WHERE m.from_user_id = p.id 
       AND m.created_at > NOW() - INTERVAL '24 hours'),
      0
    ) AS messages_24h,
    -- Last message timestamp as activity indicator
    (SELECT MAX(m.created_at) 
     FROM public.messages m 
     WHERE m.from_user_id = p.id
    ) AS last_active
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by function)
GRANT EXECUTE ON FUNCTION get_users_admin_view() TO authenticated;

-- Verification
SELECT 'Admin user view function created' as status;
