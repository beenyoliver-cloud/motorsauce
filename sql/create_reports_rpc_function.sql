-- Create RPC function for admin reports with user details
-- This function is used by /api/reports to fetch enriched report data

CREATE OR REPLACE FUNCTION public.get_reports_with_details(
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
  RETURN QUERY
  SELECT 
    ur.id as report_id,
    ur.reporter_id,
    rp.name as reporter_name,
    rp.email as reporter_email,
    ur.reported_user_id,
    COALESCE(up.name, ur.reported_user_name) as reported_user_name,
    up.email as reported_user_email,
    ur.reason,
    ur.details,
    ur.status,
    ur.admin_notes,
    ur.reviewed_by,
    ur.reviewed_at,
    ur.created_at,
    ur.updated_at
  FROM public.user_reports ur
  LEFT JOIN public.profiles rp ON rp.id = ur.reporter_id
  LEFT JOIN public.profiles up ON up.id = ur.reported_user_id
  WHERE (p_status IS NULL OR ur.status = p_status)
  ORDER BY ur.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users (admin check happens in API)
GRANT EXECUTE ON FUNCTION public.get_reports_with_details(TEXT, INTEGER, INTEGER) TO authenticated;
