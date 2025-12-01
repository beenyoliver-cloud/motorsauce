-- Fix threads RLS policies to allow thread creation
-- The issue is that SELECT policies with USING expressions can interfere with INSERT

-- Drop all existing policies on threads
DROP POLICY IF EXISTS "Users can view their own threads" ON public.threads;
DROP POLICY IF EXISTS "Users can create threads they participate in" ON public.threads;
DROP POLICY IF EXISTS "Users can update their threads" ON public.threads;

-- SELECT: Users can view threads they're part of
CREATE POLICY "Users can view their own threads"
  ON public.threads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (participant_1_id, participant_2_id)
    OR auth.uid() IN (a_user, b_user)
  );

-- INSERT: Users can create threads where they are a participant
-- Use WITH CHECK only, no USING clause for INSERT
CREATE POLICY "Users can create threads they participate in"
  ON public.threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (participant_1_id, participant_2_id)
    OR auth.uid() IN (a_user, b_user)
  );

-- UPDATE: Users can update threads they're part of
CREATE POLICY "Users can update their threads"
  ON public.threads
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (participant_1_id, participant_2_id)
    OR auth.uid() IN (a_user, b_user)
  )
  WITH CHECK (
    auth.uid() IN (participant_1_id, participant_2_id)
    OR auth.uid() IN (a_user, b_user)
  );

-- Ensure RLS is enabled
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
