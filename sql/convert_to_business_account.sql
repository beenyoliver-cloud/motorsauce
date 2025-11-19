-- ============================================================================
-- CONVERT EXISTING ACCOUNT TO BUSINESS ACCOUNT
-- ============================================================================
-- Run this in Supabase SQL Editor to convert an individual account to business
-- Replace 'YOUR_EMAIL_HERE' with the actual email address
-- ============================================================================

-- Step 1: Update the profile to business account type
UPDATE public.profiles
SET account_type = 'business'
WHERE email = 'oliver@motorsource.com';

-- Step 2: Create business_info record (if it doesn't exist)
INSERT INTO public.business_info (
  profile_id,
  business_name,
  business_type
)
SELECT 
  id,
  'Motorsource', -- Replace with your business name
  'other'      -- Replace with your business type
FROM public.profiles
WHERE email = 'oliver@motorsource.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_info WHERE profile_id = profiles.id
  );

-- Step 3: Verify the conversion
SELECT 
  p.id,
  p.name,
  p.email,
  p.account_type,
  bi.business_name,
  bi.business_type
FROM public.profiles p
LEFT JOIN public.business_info bi ON bi.profile_id = p.id
WHERE p.email = 'oliver@motorsource.com';

-- ============================================================================
-- BUSINESS TYPE OPTIONS (for reference):
-- ============================================================================
-- 'oem_supplier'              - OEM Supplier
-- 'breaker'                   - Breaker / Salvage Yard
-- 'parts_retailer'            - Parts Retailer
-- 'performance_tuner'         - Performance Tuner
-- 'restoration_specialist'    - Restoration Specialist
-- 'racing_team'               - Racing Team
-- 'custom_fabricator'         - Custom Fabricator
-- 'other'                     - Other
-- ============================================================================
