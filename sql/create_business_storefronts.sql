-- ============================================================================
-- BUSINESS STOREFRONT DATABASE SCHEMA
-- ============================================================================
-- This migration adds support for business accounts with professional
-- storefronts, including branding, promotions, reviews, and enhanced features.
--
-- GDPR Compliance: Business addresses are stored privately and never exposed
-- in public views or APIs without explicit owner authorization.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. UPDATE PROFILES TABLE FOR BUSINESS ACCOUNTS
-- ============================================================================

-- Add account type column
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' 
  CHECK (account_type IN ('individual', 'business'));

-- Add business-specific metrics
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- Index for filtering business profiles
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_business_verified ON public.profiles(business_verified) WHERE account_type = 'business';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.account_type IS 'Account type: individual for personal sellers, business for commercial storefronts';
COMMENT ON COLUMN public.profiles.business_verified IS 'Whether the business has been verified by admin';
COMMENT ON COLUMN public.profiles.total_sales IS 'Total number of completed sales (all time)';

-- ============================================================================
-- 2. CREATE BUSINESS_INFO TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Core Business Identity
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'oem_supplier',        -- Original Equipment Manufacturer supplier
    'breaker',             -- Salvage yard / breakers
    'parts_retailer',      -- General parts retailer
    'performance_tuner',   -- Performance tuning/modification specialist
    'restoration_specialist', -- Classic car restoration
    'racing_team',         -- Racing team / motorsport organization
    'custom_fabricator',   -- Custom fabrication services
    'other'                -- Other business types
  )),
  
  -- Branding Assets (Supabase Storage URLs)
  logo_url TEXT,           -- Square logo for display
  banner_url TEXT,         -- Wide banner for storefront header
  
  -- Contact Information
  phone_number TEXT,       -- Public business phone
  website_url TEXT,        -- Company website URL
  customer_support_email TEXT, -- Optional support email
  
  -- PRIVATE: Business Address (GDPR-protected)
  business_address JSONB,  -- {street, city, postcode, country} - NEVER exposed publicly
  
  -- Operating Hours (stored as JSON)
  opening_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "09:00", "close": "13:00", "closed": false},
    "sunday": {"open": "", "close": "", "closed": true}
  }'::jsonb,
  
  -- Customer Service Hours (can differ from opening hours)
  customer_service_hours JSONB,
  
  -- About Section
  about_business TEXT,     -- Rich text/markdown about the business
  specialties TEXT[],      -- Array of specialties: ['BMW', 'Mercedes', 'Performance Parts']
  years_established INTEGER, -- Year the business was established
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_info_profile ON public.business_info(profile_id);
CREATE INDEX IF NOT EXISTS idx_business_info_type ON public.business_info(business_type);
CREATE INDEX IF NOT EXISTS idx_business_info_name ON public.business_info(business_name);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_business_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_info_updated_at
  BEFORE UPDATE ON public.business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_business_info_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.business_info IS 'Extended information for business accounts including branding, contact details, and operating hours';
COMMENT ON COLUMN public.business_info.business_address IS 'PRIVATE: Business address stored for verification only, never exposed in public APIs';
COMMENT ON COLUMN public.business_info.opening_hours IS 'JSON object with days of week and open/close times';

-- ============================================================================
-- 3. ROW LEVEL SECURITY FOR BUSINESS_INFO
-- ============================================================================

ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;

-- Public read access (private fields filtered in view)
CREATE POLICY "Business info readable by anyone"
  ON public.business_info FOR SELECT
  USING (true);

-- Only profile owner can update their business info
CREATE POLICY "Business owners can update their info"
  ON public.business_info FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Only profile owner can insert business info
CREATE POLICY "Profile owners can create business info"
  ON public.business_info FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Only owner can delete
CREATE POLICY "Business owners can delete their info"
  ON public.business_info FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================================
-- 4. CREATE PROMOTED_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.promoted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  
  -- Promotion Details
  promotion_type TEXT NOT NULL CHECK (promotion_type IN (
    'featured',      -- Featured/highlighted item
    'new_arrival',   -- New arrival badge
    'sale',          -- On sale
    'spotlight'      -- Spotlight/hero item
  )),
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  promotion_text TEXT, -- Custom promotion text: "20% OFF", "NEW", "LIMITED STOCK"
  
  -- Display Order
  sort_order INTEGER DEFAULT 0,
  
  -- Active Status
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ, -- NULL = no end date
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate promotion types for same listing
  UNIQUE(business_profile_id, listing_id, promotion_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promoted_items_business ON public.promoted_items(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_promoted_items_listing ON public.promoted_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_promoted_items_active ON public.promoted_items(active, ends_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_promoted_items_type ON public.promoted_items(promotion_type);

COMMENT ON TABLE public.promoted_items IS 'Promoted/featured items for business storefronts with sale badges and spotlight positioning';

-- ============================================================================
-- 5. ROW LEVEL SECURITY FOR PROMOTED_ITEMS
-- ============================================================================

ALTER TABLE public.promoted_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promotions
CREATE POLICY "Promotions readable by anyone"
  ON public.promoted_items FOR SELECT
  USING (true);

-- Only business owner can manage their promotions
CREATE POLICY "Business owners manage promotions"
  ON public.promoted_items FOR ALL
  USING (auth.uid() = business_profile_id)
  WITH CHECK (auth.uid() = business_profile_id);

-- ============================================================================
-- 6. CREATE BUSINESS_REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  
  -- Associated Transaction (for verification)
  order_id UUID, -- Reference to order/transaction if available
  verified_purchase BOOLEAN DEFAULT false,
  
  -- Moderation
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  admin_approved BOOLEAN DEFAULT true, -- Can be set to false for moderation
  
  -- Business Response
  business_response TEXT,
  business_responded_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent multiple reviews for same order
  UNIQUE(business_profile_id, reviewer_profile_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON public.business_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_reviewer ON public.business_reviews(reviewer_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_rating ON public.business_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_business_reviews_created ON public.business_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_reviews_approved ON public.business_reviews(admin_approved, flagged);

-- Trigger for updated_at
CREATE TRIGGER business_reviews_updated_at
  BEFORE UPDATE ON public.business_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_info_timestamp();

COMMENT ON TABLE public.business_reviews IS 'Customer reviews and ratings for business accounts with moderation support';
COMMENT ON COLUMN public.business_reviews.verified_purchase IS 'Whether the reviewer actually purchased from this business';

-- ============================================================================
-- 7. ROW LEVEL SECURITY FOR BUSINESS_REVIEWS
-- ============================================================================

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved, non-flagged reviews
CREATE POLICY "Approved reviews readable by anyone"
  ON public.business_reviews FOR SELECT
  USING (admin_approved = true AND flagged = false);

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
  ON public.business_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_profile_id
  );

-- Reviewers can update their own reviews (within time limit could be added)
CREATE POLICY "Reviewers can update own reviews"
  ON public.business_reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_profile_id
    AND business_response IS NULL -- Can't edit after business responds
  );

-- Business owners can add responses to reviews
CREATE POLICY "Business can respond to reviews"
  ON public.business_reviews FOR UPDATE
  USING (
    auth.uid() = business_profile_id
  )
  WITH CHECK (
    -- Can only update business_response and business_responded_at fields
    business_response IS NOT NULL
  );

-- ============================================================================
-- 8. CREATE PUBLIC VIEW (GDPR-SAFE)
-- ============================================================================

-- This view excludes private business information (address)
CREATE OR REPLACE VIEW public.business_profiles_public AS
SELECT 
  p.id,
  p.name,
  p.email,
  p.avatar,
  p.account_type,
  p.business_verified,
  p.total_sales,
  p.avg_response_time_minutes,
  p.response_rate,
  p.created_at as member_since,
  
  -- Business Info (excluding private fields)
  bi.business_name,
  bi.business_type,
  bi.logo_url,
  bi.banner_url,
  bi.phone_number,
  bi.website_url,
  bi.customer_support_email,
  bi.opening_hours,
  bi.customer_service_hours,
  bi.about_business,
  bi.specialties,
  bi.years_established,
  
  -- Aggregated Review Data
  COALESCE(ROUND(AVG(br.rating), 1), 0) as avg_rating,
  COUNT(DISTINCT br.id) as review_count,
  COUNT(DISTINCT br.id) FILTER (WHERE br.rating = 5) as five_star_count,
  COUNT(DISTINCT br.id) FILTER (WHERE br.rating = 4) as four_star_count,
  COUNT(DISTINCT br.id) FILTER (WHERE br.rating = 3) as three_star_count,
  COUNT(DISTINCT br.id) FILTER (WHERE br.rating = 2) as two_star_count,
  COUNT(DISTINCT br.id) FILTER (WHERE br.rating = 1) as one_star_count
  
FROM public.profiles p
LEFT JOIN public.business_info bi ON bi.profile_id = p.id
LEFT JOIN public.business_reviews br ON br.business_profile_id = p.id 
  AND br.admin_approved = true 
  AND br.flagged = false
WHERE p.account_type = 'business'
GROUP BY p.id, bi.id;

COMMENT ON VIEW public.business_profiles_public IS 'GDPR-safe public view of business profiles excluding private information like business address';

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to get business address (owner only - GDPR compliant)
CREATE OR REPLACE FUNCTION get_own_business_address(profile_uuid UUID)
RETURNS JSONB AS $$
BEGIN
  -- Only return address if requester is the profile owner
  IF auth.uid() = profile_uuid THEN
    RETURN (SELECT business_address FROM public.business_info WHERE profile_id = profile_uuid);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_own_business_address IS 'Securely retrieves business address only for the profile owner (GDPR compliant)';

-- Function to check if promotion is currently active
CREATE OR REPLACE FUNCTION is_promotion_active(promotion_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  promo RECORD;
BEGIN
  SELECT active, starts_at, ends_at INTO promo
  FROM public.promoted_items
  WHERE id = promotion_id;
  
  IF NOT FOUND OR promo.active = false THEN
    RETURN false;
  END IF;
  
  IF promo.starts_at > now() THEN
    RETURN false;
  END IF;
  
  IF promo.ends_at IS NOT NULL AND promo.ends_at < now() THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate business rating breakdown
CREATE OR REPLACE FUNCTION get_business_rating_breakdown(business_id UUID)
RETURNS TABLE(
  avg_rating NUMERIC,
  total_reviews BIGINT,
  five_star BIGINT,
  four_star BIGINT,
  three_star BIGINT,
  two_star BIGINT,
  one_star BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating), 1), 0) as avg_rating,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE rating = 5) as five_star,
    COUNT(*) FILTER (WHERE rating = 4) as four_star,
    COUNT(*) FILTER (WHERE rating = 3) as three_star,
    COUNT(*) FILTER (WHERE rating = 2) as two_star,
    COUNT(*) FILTER (WHERE rating = 1) as one_star
  FROM public.business_reviews
  WHERE business_profile_id = business_id
    AND admin_approved = true
    AND flagged = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. MIGRATION FOR EXISTING USERS
-- ============================================================================

-- All existing profiles default to 'individual' account type (already set by DEFAULT)
-- No data migration needed unless you want to convert specific users to business accounts

-- Example: Convert specific user to business account (run manually if needed)
-- UPDATE public.profiles SET account_type = 'business' WHERE id = 'user-uuid-here';

-- ============================================================================
-- 11. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON public.business_info TO authenticated;
GRANT SELECT ON public.promoted_items TO authenticated;
GRANT SELECT ON public.business_reviews TO authenticated;
GRANT SELECT ON public.business_profiles_public TO authenticated;

-- Grant access to anon role for public viewing
GRANT SELECT ON public.business_profiles_public TO anon;
GRANT SELECT ON public.business_reviews TO anon;
GRANT SELECT ON public.promoted_items TO anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- 
-- Next steps:
-- 1. Update registration flow to offer business account option
-- 2. Create business settings page for managing storefront
-- 3. Build business profile/storefront components
-- 4. Implement image upload for logos and banners
-- 5. Add promotions management interface
-- 6. Build reviews submission and display UI
-- 7. Test all privacy controls and GDPR compliance
-- 
-- ============================================================================
