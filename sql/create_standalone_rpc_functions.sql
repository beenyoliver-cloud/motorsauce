-- Simple RPC functions for standalone offer system

-- Function 1: Create an offer (no messages)
CREATE OR REPLACE FUNCTION public.create_offer_standalone(
  p_listing_id UUID,
  p_seller_id UUID,
  p_listing_title TEXT,
  p_listing_price NUMERIC,
  p_offered_amount NUMERIC,
  p_listing_image TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'GBP',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer_id UUID;
  v_buyer_id UUID;
BEGIN
  -- Get current user (buyer)
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prevent self-offers
  IF v_buyer_id = p_seller_id THEN
    RAISE EXCEPTION 'Cannot make offer to yourself';
  END IF;

  -- Create the offer
  INSERT INTO public.offers (
    listing_id,
    buyer_id,
    seller_id,
    listing_title,
    listing_image,
    listing_price,
    offered_amount,
    currency,
    created_by_notes,
    status
  ) VALUES (
    p_listing_id,
    v_buyer_id,
    p_seller_id,
    p_listing_title,
    p_listing_image,
    p_listing_price,
    p_offered_amount,
    p_currency,
    p_notes,
    'pending'
  )
  RETURNING id INTO v_offer_id;

  -- Return the created offer
  RETURN json_build_object(
    'id', v_offer_id,
    'listing_id', p_listing_id,
    'buyer_id', v_buyer_id,
    'seller_id', p_seller_id,
    'offered_amount', p_offered_amount,
    'currency', p_currency,
    'status', 'pending',
    'created_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_offer_standalone TO authenticated;

-- Function 2: Respond to an offer (accept/decline/counter)
CREATE OR REPLACE FUNCTION public.respond_offer_standalone(
  p_offer_id UUID,
  p_status TEXT,
  p_counter_amount NUMERIC DEFAULT NULL,
  p_counter_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer RECORD;
  v_current_user_id UUID;
  v_is_seller BOOLEAN;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get offer
  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id;
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Check authorization
  v_is_seller := (v_current_user_id = v_offer.seller_id);
  IF NOT (v_is_seller OR v_current_user_id = v_offer.buyer_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate status transitions
  IF p_status = 'accepted' THEN
    IF NOT v_is_seller THEN
      RAISE EXCEPTION 'Only seller can accept offer';
    END IF;
  ELSIF p_status = 'declined' THEN
    IF NOT v_is_seller THEN
      RAISE EXCEPTION 'Only seller can decline offer';
    END IF;
  ELSIF p_status = 'countered' THEN
    IF NOT v_is_seller THEN
      RAISE EXCEPTION 'Only seller can counter offer';
    END IF;
    IF p_counter_amount IS NULL THEN
      RAISE EXCEPTION 'Counter amount is required';
    END IF;
  ELSIF p_status = 'withdrawn' THEN
    IF v_is_seller THEN
      RAISE EXCEPTION 'Only buyer can withdraw offer';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update offer
  UPDATE public.offers SET
    status = p_status,
    counter_amount = p_counter_amount,
    counter_notes = p_counter_notes,
    last_countered_by = CASE WHEN p_status = 'countered' THEN v_current_user_id ELSE last_countered_by END,
    responded_at = NOW()
  WHERE id = p_offer_id;

  -- Return updated offer
  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id;

  RETURN json_build_object(
    'id', v_offer.id,
    'status', v_offer.status,
    'counter_amount', v_offer.counter_amount,
    'responded_at', v_offer.responded_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_offer_standalone TO authenticated;
