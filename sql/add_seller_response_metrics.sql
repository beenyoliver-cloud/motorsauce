-- Add seller response time tracking to profiles
-- This tracks how quickly sellers respond to messages

-- Add response time columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avg_response_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_inquiries_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 100.00;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_response_time ON public.profiles(avg_response_time_minutes);

-- Function to calculate and update seller response time
CREATE OR REPLACE FUNCTION update_seller_response_time()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_id UUID;
  thread_created_at TIMESTAMPTZ;
  last_message_from_recipient TIMESTAMPTZ;
  response_time_minutes INTEGER;
  is_first_response BOOLEAN;
BEGIN
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
  IF recipient_id = NEW.sender_id THEN
    -- sender is participant_1, so recipient must be participant_2
    recipient_id := sender_id;  -- swap
  ELSE
    recipient_id := recipient_id;
  END IF;

  -- Check if this is a response from the recipient to the sender
  -- (seller responding to buyer inquiry)
  IF NEW.sender_id != recipient_id THEN
    RETURN NEW; -- Not a seller response, skip
  END IF;

  -- Find the last message from the OTHER person (the inquirer)
  SELECT created_at INTO last_message_from_recipient
  FROM public.messages
  WHERE thread_id = NEW.thread_id
    AND sender_id != NEW.sender_id
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
    WHERE id = NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update response time on new messages
DROP TRIGGER IF EXISTS track_seller_response_time ON public.messages;
CREATE TRIGGER track_seller_response_time
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_response_time();

-- Function to track inquiry reception (for response rate)
CREATE OR REPLACE FUNCTION track_inquiry_received()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
BEGIN
  -- Determine the recipient of this message
  SELECT 
    CASE 
      WHEN participant_1_id = NEW.sender_id THEN participant_2_id
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

-- Trigger to track inquiries
DROP TRIGGER IF EXISTS track_message_inquiry ON public.messages;
CREATE TRIGGER track_message_inquiry
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION track_inquiry_received();

-- Comments for documentation
COMMENT ON COLUMN public.profiles.avg_response_time_minutes IS 'Average time in minutes for seller to respond to inquiries';
COMMENT ON COLUMN public.profiles.total_responses IS 'Total number of times seller has responded to inquiries';
COMMENT ON COLUMN public.profiles.total_inquiries_received IS 'Total number of inquiries received by seller';
COMMENT ON COLUMN public.profiles.response_rate IS 'Percentage of inquiries that received a response';
