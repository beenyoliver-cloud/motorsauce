-- Fix RLS policy for listings - make ALL listings publicly viewable
-- Run this in your Supabase SQL editor

-- Drop existing policies (handle historical names with and without trailing period)
DROP POLICY IF EXISTS "Listings are viewable by everyone." ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Users can create their own listings." ON public.listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings." ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings." ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;

-- Recreate the SELECT policy with explicit public access
CREATE POLICY "Listings are viewable by everyone"
  ON public.listings
  FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- Recreate INSERT policy
CREATE POLICY "Users can create their own listings"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Recreate UPDATE policy
CREATE POLICY "Users can update their own listings"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Recreate DELETE policy (owners may delete their own rows)
CREATE POLICY "Users can delete their own listings"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Verify RLS is enabled
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Test the policy
SELECT COUNT(*) as visible_listings FROM public.listings;
