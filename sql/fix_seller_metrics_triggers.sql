-- Fix seller response tracking triggers to use correct column names
-- The triggers were using sender_id which doesn't exist
-- Actual columns are: from_user_id (new) or sender (legacy)

-- Function to calculate and update seller response time
CREATE OR REPLACE FUNCTION update_seller_response_time()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_id UUID;
  message_sender_id UUID;
  thread_created_at TIMESTAMPTZ;
  last_message_from_recipient TIMESTAMPTZ;
  response_time_minutes INTEGER;
  is_first_response BOOLEAN;
BEGIN
  -- Get the sender ID from the message (handle both column names)
  message_sender_id := COALESCE(NEW.from_user_id, NEW.sender);
  
  IF message_sender_id IS NULL THEN
    RETURN NEW; -- No sender identified, skip
  END IF;

  -- Get thread info
  SELECT 
    participant_1_id, 
    participant_2_id, 
    created_at 
  INTO 
    recipient_id, 
    sender_id, 
    thread_created_at
  FROM public.threads 
  WHERE id = NEW.thread_id;

  -- Determine who is the seller (recipient) and who initiated (sender)
  -- The recipient is the person receiving the NEW message
  IF recipient_id = message_sender_id THEN
    -- sender is participant_1, so recipient must be participant_2
    recipient_id := sender_id;  -- swap
  ELSE
    recipient_id := recipient_id;
  END IF;

  -- Check if this is a response from the recipient to the sender
  -- (seller responding to buyer inquiry)
  IF message_sender_id != recipient_id THEN
    RETURN NEW; -- Not a seller response, skip
  END IF;

  -- Find the last message from the OTHER person (the inquirer)
  SELECT created_at INTO last_message_from_recipient
  FROM public.messages
  WHERE thread_id = NEW.thread_id
    AND COALESCE(from_user_id, sender) != message_sender_id
    AND created_at < NEW.created_at
  ORDER BY created_at DESC
  LIMIT 1;

  -- If there's no previous message, this might be seller initiating - skip
  IF last_message_from_recipient IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate response time in minutes
  response_time_minutes := EXTRACT(EPOCH FROM (NEW.created_at - last_message_from_recipient)) / 60;

  -- Only count reasonable response times (under 7 days = 10080 minutes)
  IF response_time_minutes > 0 AND response_time_minutes < 10080 THEN
    -- Update seller's response metrics
    UPDATE public.profiles
    SET 
      total_responses = COALESCE(total_responses, 0) + 1,
      avg_response_time_minutes = (
        COALESCE(avg_response_time_minutes * total_responses, 0) + response_time_minutes
      ) / (COALESCE(total_responses, 0) + 1)
    WHERE id = message_sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track inquiry reception (for response rate)
CREATE OR REPLACE FUNCTION track_inquiry_received()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  message_sender_id UUID;
BEGIN
  -- Get the sender ID from the message (handle both column names)
  message_sender_id := COALESCE(NEW.from_user_id, NEW.sender);
  
  IF message_sender_id IS NULL THEN
    RETURN NEW; -- No sender identified, skip
  END IF;

  -- Determine the recipient of this message
  SELECT 
    CASE 
      WHEN participant_1_id = message_sender_id THEN participant_2_id
      ELSE participant_1_id
    END INTO recipient_id
  FROM public.threads
  WHERE id = NEW.thread_id;

  -- Increment inquiries received for the recipient
  UPDATE public.profiles
  SET total_inquiries_received = COALESCE(total_inquiries_received, 0) + 1,
      response_rate = (
        CAST(COALESCE(total_responses, 0) AS DECIMAL) / 
        NULLIF(COALESCE(total_inquiries_received, 0) + 1, 0) * 100
      )
  WHERE id = recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Seller response tracking triggers fixed to use from_user_id/sender columns';
END $$;
