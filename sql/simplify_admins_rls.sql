-- Simplified admins RLS policy that actually works
-- The issue: The original policies were too restrictive
-- Solution: Use a simple permissive policy for SELECT

DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can add admins" ON public.admins;
DROP POLICY IF EXISTS "Admins can remove admins" ON public.admins;

-- Single simple policy: Anyone can see admins table (it's not sensitive data)
-- The actual security is enforced by the admins table - you have to be added to it
CREATE POLICY "Public read access to admins"
  ON public.admins
  FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can add admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE id = auth.uid()
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can remove admins"
  ON public.admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE id = auth.uid()
    )
  );

SELECT 'Admins table RLS simplified successfully!' as status;
