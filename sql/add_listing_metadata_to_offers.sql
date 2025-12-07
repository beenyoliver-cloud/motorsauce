-- Add listing metadata columns to offers table
-- These columns will store snapshot of listing info at time of offer

-- Add columns if they don't exist
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS listing_title TEXT,
ADD COLUMN IF NOT EXISTS listing_image TEXT;

-- Add helpful comment
COMMENT ON COLUMN public.offers.listing_title IS 'Snapshot of listing title at time of offer creation';
COMMENT ON COLUMN public.offers.listing_image IS 'Snapshot of listing image URL at time of offer creation';

-- Backfill existing offers with current listing data
-- Note: listings.images is JSONB array, we take the first image
UPDATE public.offers o
SET 
  listing_title = l.title,
  listing_image = CASE 
    WHEN l.images IS NOT NULL AND jsonb_array_length(l.images) > 0 
    THEN l.images->0->>'url'
    ELSE NULL
  END
FROM public.listings l
WHERE o.listing_id = l.id
  AND (o.listing_title IS NULL OR o.listing_image IS NULL);

-- Verify the update
SELECT 
  o.id,
  o.listing_id,
  o.listing_title,
  o.listing_image,
  CASE 
    WHEN o.listing_title IS NOT NULL AND o.listing_image IS NOT NULL THEN '✅ Has metadata'
    ELSE '❌ Missing metadata'
  END as status
FROM public.offers o
ORDER BY o.created_at DESC
LIMIT 10;
