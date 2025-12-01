-- Fix RLS policy for messages to handle both from_user_id (new) and sender (legacy)
-- Run this in Supabase SQL Editor

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create messages in their threads" ON public.messages;

-- Create new INSERT policy that handles both column variants
CREATE POLICY "Users can create messages in their threads"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check new schema column (from_user_id) OR legacy column (sender)
    (from_user_id = auth.uid() OR sender = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = messages.thread_id
      AND auth.uid() IN (threads.participant_1_id, threads.participant_2_id)
    )
  );

-- Verify RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Messages RLS policy updated to handle both from_user_id and sender columns';
END $$;
