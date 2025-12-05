-- Final fix for RLS violation when creating threads/messages
-- This uses SECURITY DEFINER to bypass RLS policies for system operations

DROP FUNCTION IF EXISTS respond_offer(UUID, TEXT, INTEGER);

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
  -- Get current user from JWT claim
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized - no auth context';
  END IF;

  -- Get offer
  SELECT * INTO v_offer FROM public.offers WHERE id = p_offer_id;
  
  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Check if offer has starter_id and recipient_id
  IF v_offer.starter_id IS NULL OR v_offer.recipient_id IS NULL THEN
    RAISE EXCEPTION 'Offer missing starter_id or recipient_id columns';
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

  -- Get thread_id from offer
  v_thread_id := v_offer.thread_id;
  
  -- If no thread exists, find or create it (SECURITY DEFINER bypasses RLS)
  IF v_thread_id IS NULL THEN
    -- Try to find existing thread
    SELECT id INTO v_thread_id
    FROM public.threads
    WHERE (participant_1_id = v_offer.starter_id AND participant_2_id = v_offer.recipient_id)
       OR (participant_1_id = v_offer.recipient_id AND participant_2_id = v_offer.starter_id)
    LIMIT 1;
    
    -- Create thread if it doesn't exist
    IF v_thread_id IS NULL THEN
      INSERT INTO public.threads (participant_1_id, participant_2_id, listing_ref)
      VALUES (
        CASE WHEN v_offer.starter_id < v_offer.recipient_id THEN v_offer.starter_id ELSE v_offer.recipient_id END,
        CASE WHEN v_offer.starter_id < v_offer.recipient_id THEN v_offer.recipient_id ELSE v_offer.starter_id END,
        v_offer.listing_id
      )
      RETURNING id INTO v_thread_id;
      
      -- Update offer with new thread_id
      UPDATE public.offers SET thread_id = v_thread_id WHERE id = p_offer_id;
    END IF;
  END IF;

  -- Generate system message based on action
  v_system_text := CASE 
    WHEN p_status IN ('accept', 'accepted') THEN 
      CASE 
        WHEN v_current_user_id = v_offer.recipient_id THEN '✅ Seller accepted the offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
        ELSE '✅ Your offer of £' || (v_offer.amount_cents::float / 100)::text || ' has been accepted!'
      END
    WHEN p_status IN ('reject', 'declined') THEN 
      CASE 
        WHEN v_current_user_id = v_offer.recipient_id THEN '❌ Seller declined the offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
        ELSE '❌ Your offer of £' || (v_offer.amount_cents::float / 100)::text || ' has been declined.'
      END
    WHEN p_status IN ('counter', 'countered') THEN 
      CASE 
        WHEN v_current_user_id = v_offer.recipient_id THEN '📊 Seller countered with £' || (COALESCE(p_counter_amount_cents, v_offer.counter_amount * 100)::float / 100)::text || '.'
        ELSE '📊 You have countered with £' || (COALESCE(p_counter_amount_cents, v_offer.counter_amount * 100)::float / 100)::text || '.'
      END
    WHEN p_status = 'withdrawn' THEN 
      CASE 
        WHEN v_current_user_id = v_offer.starter_id THEN '⚠️ You withdrew your offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
        ELSE '⚠️ The buyer withdrew their offer of £' || (v_offer.amount_cents::float / 100)::text || '.'
      END
    ELSE 'Offer status changed to ' || p_status
  END;

  -- Insert system message (SECURITY DEFINER bypasses RLS)
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

  -- Mark thread as unread for the other participant
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION respond_offer(UUID, TEXT, INTEGER) TO authenticated;

-- Verify the function was created with correct security
SELECT 
  p.proname as function_name,
  CASE p.prosecdef 
    WHEN true THEN 'SECURITY DEFINER' 
    ELSE 'SECURITY INVOKER' 
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'respond_offer'
  AND n.nspname = 'public';
