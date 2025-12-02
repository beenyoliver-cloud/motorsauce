-- Fix PostgREST ambiguity: create_offer has overloads with text vs uuid listing_id
-- Create a wrapper that explicitly casts to uuid to avoid "Could not choose best candidate"

-- Drop old overload with text listing_id if it exists (legacy from early schema)
DROP FUNCTION IF EXISTS public.create_offer(uuid, text, integer, text, text, text);

-- Ensure only the uuid version exists
-- This should already be present from offers_api_functions.sql
-- If not, uncomment and run:
-- CREATE OR REPLACE FUNCTION public.create_offer(
--   p_thread_id uuid,
--   p_listing_id uuid,
--   p_amount_cents integer,
--   p_currency text DEFAULT 'GBP',
--   p_listing_title text DEFAULT NULL,
--   p_listing_image text DEFAULT NULL
-- )
-- RETURNS public.offers AS $$
-- ... (see offers_api_functions.sql for full body)

-- Create a wrapper with an unambiguous name that handles both schemas
CREATE OR REPLACE FUNCTION public.create_offer_uuid(
  p_thread_id uuid,
  p_listing_id uuid,
  p_amount_cents integer,
  p_currency text DEFAULT 'GBP',
  p_listing_title text DEFAULT NULL,
  p_listing_image text DEFAULT NULL
)
RETURNS public.offers AS $$
DECLARE
  uid uuid;
  recipient uuid;
  new_offer public.offers;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  recipient := public.get_other_participant(p_thread_id, uid);

  -- Detect schema: check if starter_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'starter_id'
  ) THEN
    -- New schema: starter_id, recipient_id
    INSERT INTO public.offers (
      thread_id, listing_id, listing_title, listing_image,
      starter_id, recipient_id, amount_cents, currency, status
    ) VALUES (
      p_thread_id, p_listing_id, p_listing_title, p_listing_image,
      uid, recipient, p_amount_cents, COALESCE(p_currency, 'GBP'), 'pending'
    ) RETURNING * INTO new_offer;
  ELSE
    -- Legacy schema: starter, recipient
    INSERT INTO public.offers (
      thread_id, listing_id, listing_title, listing_image,
      starter, recipient, amount_cents, currency, status
    ) VALUES (
      p_thread_id, p_listing_id, p_listing_title, p_listing_image,
      uid, recipient, p_amount_cents, COALESCE(p_currency, 'GBP'), 'pending'
    ) RETURNING * INTO new_offer;
  END IF;

  -- System message
  INSERT INTO public.messages (
    thread_id, from_user_id, sender, message_type, text_content, content
  ) VALUES (
    p_thread_id, uid, uid, 'system',
    'Started an offer of £' || (p_amount_cents::float/100)::text,
    'Started an offer of £' || (p_amount_cents::float/100)::text
  );

  -- Offer message
  INSERT INTO public.messages (
    thread_id, from_user_id, sender, message_type,
    offer_id, offer_amount_cents, offer_currency, offer_status,
    text_content, content
  ) VALUES (
    p_thread_id, uid, uid, 'offer',
    new_offer.id, p_amount_cents, COALESCE(p_currency,'GBP'), 'pending',
    'Offer: £' || (p_amount_cents::float/100)::text,
    'Offer: £' || (p_amount_cents::float/100)::text
  );

  RETURN new_offer;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_offer_uuid(uuid, uuid, integer, text, text, text) TO authenticated;
