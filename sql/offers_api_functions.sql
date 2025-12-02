-- Offers API functions with SECURITY DEFINER to ensure consistent behavior
-- Validate access via auth.uid() and thread participants

-- Helper: get other participant in a thread
CREATE OR REPLACE FUNCTION public.get_other_participant(p_thread_id uuid, p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  t RECORD;
  other_id uuid;
BEGIN
  SELECT participant_1_id, participant_2_id INTO t
  FROM public.threads WHERE id = p_thread_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'thread_not_found';
  END IF;
  IF t.participant_1_id = p_user_id THEN
    other_id := t.participant_2_id;
  ELSIF t.participant_2_id = p_user_id THEN
    other_id := t.participant_1_id;
  ELSE
    RAISE EXCEPTION 'user_not_in_thread';
  END IF;
  RETURN other_id;
END; $$ LANGUAGE plpgsql STABLE;

-- Create an offer safely and emit messages
CREATE OR REPLACE FUNCTION public.create_offer(
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
  amount_ok integer;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  recipient := public.get_other_participant(p_thread_id, uid);

  -- Try new schema (starter_id, recipient_id) first; fall back to legacy (starter, recipient)
  BEGIN
    INSERT INTO public.offers (
      thread_id, listing_id, listing_title, listing_image,
      starter_id, recipient_id, amount_cents, currency, status
    ) VALUES (
      p_thread_id, p_listing_id, p_listing_title, p_listing_image,
      uid, recipient, p_amount_cents, COALESCE(p_currency, 'GBP'), 'pending'
    ) RETURNING * INTO new_offer;
  EXCEPTION
    WHEN undefined_column THEN
      -- Legacy schema: use starter, recipient (no _id suffix)
      INSERT INTO public.offers (
        thread_id, listing_id, listing_title, listing_image,
        starter, recipient, amount_cents, currency, status
      ) VALUES (
        p_thread_id, p_listing_id, p_listing_title, p_listing_image,
        uid, recipient, p_amount_cents, COALESCE(p_currency, 'GBP'), 'pending'
      ) RETURNING * INTO new_offer;
  END;

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

-- Respond to an offer (accept/decline/counter). Counter creates a new offer from seller
CREATE OR REPLACE FUNCTION public.respond_offer(
  p_offer_id uuid,
  p_status text,
  p_counter_amount_cents integer DEFAULT NULL
)
RETURNS public.offers AS $$
DECLARE
  uid uuid;
  o public.offers;
  other uuid;
  new_counter public.offers;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO o FROM public.offers WHERE id = p_offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer_not_found'; END IF;

  IF p_status NOT IN ('accepted','declined','rejected','countered','withdrawn') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  -- Only participants can respond (handle both new and legacy schema)
  IF uid NOT IN (COALESCE(o.starter_id, o.starter), COALESCE(o.recipient_id, o.recipient)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_status IN ('accepted','declined','rejected','withdrawn') THEN
    UPDATE public.offers
      SET status = CASE WHEN p_status='rejected' THEN 'declined' ELSE p_status END,
          updated_at = NOW()
      WHERE id = p_offer_id;

    INSERT INTO public.messages (thread_id, from_user_id, sender, message_type, text_content, content)
    VALUES (
      o.thread_id, uid, uid, 'system',
      CASE 
        WHEN p_status='accepted' THEN 'Offer accepted'
        WHEN p_status IN ('declined','rejected') THEN 'Offer declined'
        WHEN p_status='withdrawn' THEN 'Offer withdrawn'
      END,
      CASE 
        WHEN p_status='accepted' THEN 'Offer accepted'
        WHEN p_status IN ('declined','rejected') THEN 'Offer declined'
        WHEN p_status='withdrawn' THEN 'Offer withdrawn'
      END
    );

    RETURN (SELECT * FROM public.offers WHERE id = p_offer_id);
  END IF;

  -- Counter: seller proposes a new amount; automatically declines previous
  IF p_status = 'countered' THEN
    IF uid != COALESCE(o.recipient_id, o.recipient) THEN
      RAISE EXCEPTION 'only_recipient_can_counter';
    END IF;
    IF p_counter_amount_cents IS NULL OR p_counter_amount_cents <= 0 THEN
      RAISE EXCEPTION 'invalid_counter';
    END IF;

    -- Decline old offer
    UPDATE public.offers SET status='declined', updated_at=NOW() WHERE id = p_offer_id;

    -- Create counter offer from seller to buyer (handle both schemas)
    BEGIN
      INSERT INTO public.offers (
        thread_id, listing_id, listing_title, listing_image,
        starter_id, recipient_id, amount_cents, currency, status
      ) VALUES (
        o.thread_id, o.listing_id, o.listing_title, o.listing_image,
        uid, COALESCE(o.starter_id, o.starter), p_counter_amount_cents, COALESCE(o.currency,'GBP'), 'pending'
      ) RETURNING * INTO new_counter;
    EXCEPTION
      WHEN undefined_column THEN
        -- Legacy schema
        INSERT INTO public.offers (
          thread_id, listing_id, listing_title, listing_image,
          starter, recipient, amount_cents, currency, status
        ) VALUES (
          o.thread_id, o.listing_id, o.listing_title, o.listing_image,
          uid, COALESCE(o.starter_id, o.starter), p_counter_amount_cents, COALESCE(o.currency,'GBP'), 'pending'
        ) RETURNING * INTO new_counter;
    END;

    -- Messages
    INSERT INTO public.messages (thread_id, from_user_id, sender, message_type, text_content, content)
    VALUES (o.thread_id, uid, uid, 'system', 'Sent a counter offer', 'Sent a counter offer');

    INSERT INTO public.messages (
      thread_id, from_user_id, sender, message_type,
      offer_id, offer_amount_cents, offer_currency, offer_status,
      text_content, content
    ) VALUES (
      o.thread_id, uid, uid, 'offer',
      new_counter.id, p_counter_amount_cents, COALESCE(o.currency,'GBP'), 'pending',
      'Counter Offer: £' || (p_counter_amount_cents::float/100)::text,
      'Counter Offer: £' || (p_counter_amount_cents::float/100)::text
    );

    RETURN new_counter;
  END IF;

  RETURN o;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_offer(uuid, uuid, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_offer(uuid, text, integer) TO authenticated;
