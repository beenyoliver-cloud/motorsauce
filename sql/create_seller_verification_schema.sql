-- Create seller verification and business info tables
-- Run this migration to enable seller verification features

-- Business info table (stores business details for seller accounts)
CREATE TABLE IF NOT EXISTS public.business_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  business_type TEXT,
  phone_number TEXT,
  website_url TEXT,
  tax_id TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'GB',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seller verifications table (tracks compliance document submissions)
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  document_type TEXT,
  document_url TEXT,
  notes TEXT,
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_info
DROP POLICY IF EXISTS "Users can view their own business info" ON public.business_info;
CREATE POLICY "Users can view their own business info" ON public.business_info
  FOR SELECT USING (
    auth.uid() = profile_id
  );

DROP POLICY IF EXISTS "Users can insert their own business info" ON public.business_info;
CREATE POLICY "Users can insert their own business info" ON public.business_info
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

DROP POLICY IF EXISTS "Users can update their own business info" ON public.business_info;
CREATE POLICY "Users can update their own business info" ON public.business_info
  FOR UPDATE USING (
    auth.uid() = profile_id
  );

-- RLS Policies for seller_verifications
DROP POLICY IF EXISTS "Users can view their own verifications" ON public.seller_verifications;
CREATE POLICY "Users can view their own verifications" ON public.seller_verifications
  FOR SELECT USING (
    auth.uid() = profile_id
  );

DROP POLICY IF EXISTS "Users can insert their own verifications" ON public.seller_verifications;
CREATE POLICY "Users can insert their own verifications" ON public.seller_verifications
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_info_profile_id ON public.business_info(profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_profile_id ON public.seller_verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON public.seller_verifications(status);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_created_at ON public.seller_verifications(created_at DESC);

-- Add verification columns to profiles table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN business_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE public.profiles ADD COLUMN verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_notes') THEN
    ALTER TABLE public.profiles ADD COLUMN verification_notes TEXT;
  END IF;
END $$;

-- Trigger to update business_info.updated_at
CREATE OR REPLACE FUNCTION update_business_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_business_info_timestamp ON public.business_info;
CREATE TRIGGER trigger_update_business_info_timestamp
  BEFORE UPDATE ON public.business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_business_info_timestamp();

-- Trigger to update seller_verifications.updated_at
DROP TRIGGER IF EXISTS trigger_update_seller_verifications_timestamp ON public.seller_verifications;
CREATE TRIGGER trigger_update_seller_verifications_timestamp
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_business_info_timestamp();
