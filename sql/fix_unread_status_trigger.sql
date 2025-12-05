-- Complete fix for messaging and offers system
-- This handles:
-- 1. Marking threads as unread when new message arrives
-- 2. Handling offer responses and sending messages back to buyer

-- ==================== FUNCTION 1: Mark thread unread for recipient ====================
CREATE OR REPLACE FUNCTION mark_thread_unread_for_recipient()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_participant_1 UUID;
  v_participant_2 UUID;
BEGIN
  -- Get the thread's two participants
  SELECT participant_1_id, participant_2_id INTO v_participant_1, v_participant_2
  FROM public.threads
  WHERE id = NEW.thread_id;

  -- Determine the recipient (the participant who did NOT send the message)
  IF v_participant_1 = NEW.from_user_id THEN
    v_recipient_id := v_participant_2;
  ELSIF v_participant_2 = NEW.from_user_id THEN
    v_recipient_id := v_participant_1;
  ELSE
    RETURN NEW;
  END IF;

  -- Delete the read status for the recipient to mark the thread as unread
  DELETE FROM public.thread_read_status
  WHERE thread_id = NEW.thread_id
    AND user_id = v_recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for marking unread
DROP TRIGGER IF EXISTS trigger_mark_thread_unread_for_recipient ON public.messages;
CREATE TRIGGER trigger_mark_thread_unread_for_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_thread_unread_for_recipient();

-- ==================== FUNCTION 2: Handle offer responses ====================
-- This RPC responds to an offer (accept, decline, counter) and sends a message
CREATE OR REPLACE FUNCTION respond_offer(
  p_offer_id UUID,
  p_status TEXT,
  p_counter_amount_cents INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_offer RECORD;
  v_message RECORD;
  v_system_text TEXT;
  v_thread_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get offer
  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id;
  
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Verify authorization and status transition
  IF p_status = 'withdrawn' THEN
    IF v_offer.starter_id != v_current_user_id THEN
      RAISE EXCEPTION 'Only buyer can withdraw';
    END IF;
    IF v_offer.status != 'pending' THEN
      RAISE EXCEPTION 'Can only withdraw pending offers';
    END IF;
  ELSIF p_status = 'accept' OR p_status = 'accepted' THEN
    IF v_offer.recipient_id != v_current_user_id THEN
      RAISE EXCEPTION 'Only seller can accept';
    END IF;
    IF NOT (v_offer.status = 'pending' OR v_offer.status = 'countered') THEN
      RAISE EXCEPTION 'Can only accept pending or countered offers';
    END IF;
  ELSIF p_status = 'reject' OR p_status = 'declined' THEN
    IF v_offer.recipient_id != v_current_user_id THEN
      RAISE EXCEPTION 'Only seller can decline';
    END IF;
    IF v_offer.status != 'pending' THEN
      RAISE EXCEPTION 'Can only decline pending offers';
    END IF;
  ELSIF p_status = 'counter' OR p_status = 'countered' THEN
    IF v_offer.recipient_id != v_current_user_id THEN
      RAISE EXCEPTION 'Only seller can counter';
    END IF;
    IF v_offer.status != 'pending' THEN
      RAISE EXCEPTION 'Can only counter pending offers';
    END IF;
    IF p_counter_amount_cents IS NULL OR p_counter_amount_cents <= 0 THEN
      RAISE EXCEPTION 'Invalid counter amount';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Update offer status
  UPDATE public.offers
  SET 
    status = CASE 
      WHEN p_status IN ('accept', 'accepted') THEN 'accepted'
      WHEN p_status IN ('reject', 'declined') THEN 'rejected'
      WHEN p_status IN ('counter', 'countered') THEN 'countered'
      ELSE p_status
    END,
    counter_amount = CASE WHEN p_counter_amount_cents IS NOT NULL THEN p_counter_amount_cents / 100.0 ELSE counter_amount END,
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_offer_id
  RETURNING * INTO v_offer;

  -- Get or create thread for this offer
  SELECT thread_id INTO v_thread_id FROM public.offers WHERE id = p_offer_id;
  
  IF v_thread_id IS NULL THEN
    -- Create thread if it doesn't exist
    INSERT INTO public.threads (participant_1_id, participant_2_id, listing_ref)
    VALUES (
      CASE WHEN v_offer.starter_id < v_offer.recipient_id THEN v_offer.starter_id ELSE v_offer.recipient_id END,
      CASE WHEN v_offer.starter_id < v_offer.recipient_id THEN v_offer.recipient_id ELSE v_offer.starter_id END,
      v_offer.listing_id
    )
    RETURNING id INTO v_thread_id;
  END IF;

  -- Generate system message based on action
  v_system_text := CASE 
    WHEN p_status IN ('accept', 'accepted') THEN 
      '✅ Seller accepted the offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
    WHEN p_status IN ('reject', 'declined') THEN 
      '❌ Seller declined the offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
    WHEN p_status IN ('counter', 'countered') THEN 
      '📊 Seller countered with £' || (COALESCE(p_counter_amount_cents, v_offer.counter_amount * 100)::float / 100)::text || '.'
    WHEN p_status = 'withdrawn' THEN 
      '⚠️ Buyer withdrew the offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
    ELSE 'Offer status changed to ' || p_status
  END;

  -- Insert system message to notify other party
  INSERT INTO public.messages (
    thread_id,
    from_user_id,
    message_type,
    text_content
  )
  VALUES (
    v_thread_id,
    v_current_user_id,
    'system',
    v_system_text
  )
  RETURNING * INTO v_message;

  -- Mark thread as unread for the other participant (if different user)
  DELETE FROM public.thread_read_status
  WHERE thread_id = v_thread_id
    AND user_id != v_current_user_id;

  -- Return the updated offer
  RETURN jsonb_build_object(
    'id', v_offer.id,
    'status', v_offer.status,
    'counter_amount', v_offer.counter_amount,
    'responded_at', v_offer.responded_at,
    'message_id', v_message.id,
    'thread_id', v_thread_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== VERIFICATION ====================
-- Verify both functions exist
SELECT 
  n.nspname,
  p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('mark_thread_unread_for_recipient', 'respond_offer')
ORDER BY p.proname;

-- Verify trigger exists
SELECT 
  tgname,
  tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_mark_thread_unread_for_recipient';
