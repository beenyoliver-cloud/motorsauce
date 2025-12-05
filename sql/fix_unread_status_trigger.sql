-- Fix: Automatically mark thread as unread for recipient when new message arrives
-- This ensures the notification badge updates in real-time

-- Function to mark thread as unread for the recipient when a new message is inserted
CREATE OR REPLACE FUNCTION mark_thread_unread_for_recipient()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_participant_1 UUID;
  v_participant_2 UUID;
BEGIN
  -- Get the thread's participants
  SELECT participant_1_id, participant_2_id INTO v_participant_1, v_participant_2
  FROM public.threads
  WHERE id = NEW.thread_id;

  -- Determine the recipient (the participant who did NOT send the message)
  IF v_participant_1 = NEW.from_user_id THEN
    v_recipient_id := v_participant_2;
  ELSIF v_participant_2 = NEW.from_user_id THEN
    v_recipient_id := v_participant_1;
  ELSE
    -- Sender is not a participant of this thread (shouldn't happen, but handle gracefully)
    RETURN NEW;
  END IF;

  -- Delete the read status for the recipient to mark the thread as unread
  DELETE FROM public.thread_read_status
  WHERE thread_id = NEW.thread_id
    AND user_id = v_recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run after each message insert
DROP TRIGGER IF EXISTS trigger_mark_thread_unread_for_recipient ON public.messages;
CREATE TRIGGER trigger_mark_thread_unread_for_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_thread_unread_for_recipient();

-- Verify the trigger was created
SELECT 
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_mark_thread_unread_for_recipient';

COMMENT ON FUNCTION mark_thread_unread_for_recipient() IS 'Marks thread as unread for recipient when a new message arrives by deleting their read status record';
COMMENT ON TRIGGER trigger_mark_thread_unread_for_recipient ON public.messages IS 'Automatically marks thread as unread for the message recipient';
