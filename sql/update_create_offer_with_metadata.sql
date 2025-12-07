-- Update create_offer_uuid RPC function to accept and store listing metadata
-- This ensures listing title and image are saved when offer is created

-- Drop existing function first (needed if return type changes)
DROP FUNCTION IF EXISTS public.create_offer_uuid(uuid, uuid, integer, text, text, text);
DROP FUNCTION IF EXISTS public.create_offer_uuid(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.create_offer_uuid(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.create_offer_uuid(
  p_thread_id UUID,
  p_listing_id UUID,
  p_amount_cents INTEGER,
  p_currency TEXT DEFAULT 'GBP',
  p_listing_title TEXT DEFAULT NULL,
  p_listing_image TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer_id UUID;
  v_message_id UUID;
  v_sender_id UUID;
  v_recipient_id UUID;
  v_thread RECORD;
BEGIN
  -- Get current user
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get thread details to determine recipient
  SELECT * INTO v_thread
  FROM public.threads
  WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Determine recipient (the other person in the thread)
  IF v_thread.participant_1_id = v_sender_id THEN
    v_recipient_id := v_thread.participant_2_id;
  ELSIF v_thread.participant_2_id = v_sender_id THEN
    v_recipient_id := v_thread.participant_1_id;
  ELSE
    RAISE EXCEPTION 'User is not a participant in this thread';
  END IF;

  -- Create the offer with listing metadata
  INSERT INTO public.offers (
    thread_id,
    listing_id,
    listing_title,
    listing_image,
    starter,
    starter_id,
    recipient,
    recipient_id,
    amount_cents,
    currency,
    status
  ) VALUES (
    p_thread_id,
    p_listing_id,
    p_listing_title,
    p_listing_image,
    v_sender_id,
    v_sender_id,
    v_recipient_id,
    v_recipient_id,
    p_amount_cents,
    p_currency,
    'pending'
  )
  RETURNING id INTO v_offer_id;

  -- Create associated message
  INSERT INTO public.messages (
    thread_id,
    from_user_id,
    sender,
    message_type,
    text_content,
    offer_id
  ) VALUES (
    p_thread_id,
    v_sender_id,
    v_sender_id,
    'offer',
    'New offer: ' || p_currency || ' ' || (p_amount_cents::NUMERIC / 100)::TEXT,
    v_offer_id
  )
  RETURNING id INTO v_message_id;

  -- Update thread's last message
  UPDATE public.threads
  SET 
    last_message_at = NOW(),
    last_message_text = 'New offer'
  WHERE id = p_thread_id;

  -- Mark thread as unread for recipient
  INSERT INTO public.thread_read_status (thread_id, user_id, last_read_at, is_unread)
  VALUES (p_thread_id, v_recipient_id, NOW() - INTERVAL '1 second', true)
  ON CONFLICT (thread_id, user_id) 
  DO UPDATE SET is_unread = true;

  -- Return the created offer
  RETURN json_build_object(
    'id', v_offer_id,
    'listing_id', p_listing_id,
    'listing_title', p_listing_title,
    'listing_image', p_listing_image,
    'starter', v_sender_id,
    'recipient', v_recipient_id,
    'amount', p_amount_cents,
    'currency', p_currency,
    'status', 'pending',
    'message_id', v_message_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_offer_uuid TO authenticated;
