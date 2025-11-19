-- Check Motorsource account status
SELECT 
  p.id,
  p.name,
  p.email,
  p.account_type,
  p.avatar,
  p.background_image,
  bi.business_name,
  bi.business_type
FROM profiles p
LEFT JOIN business_info bi ON p.id = bi.profile_id
WHERE p.email = 'oliver@motorsource.com' 
   OR p.name ILIKE '%motorsource%'
   OR p.name ILIKE '%motor%source%';
