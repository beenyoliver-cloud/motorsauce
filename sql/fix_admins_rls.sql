-- Fix admins table RLS policies
-- The admins table needs RLS policies so users can check their own admin status
-- Run this in Supabase SQL Editor

-- 1. Ensure the admins table exists
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS (if not already enabled)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any (to start fresh)
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins can view all admins" ON public.admins;
DROP POLICY IF EXISTS "Service role can manage admins" ON public.admins;

-- 4. Create policy: Users can check if THEY are admin
CREATE POLICY "Users can check their own admin status"
  ON public.admins
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Create policy: Admins can see all admins
CREATE POLICY "Admins can view all admins"
  ON public.admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- 6. Create policy: Admins can insert new admins
CREATE POLICY "Admins can add admins"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- 7. Create policy: Admins can delete admins
CREATE POLICY "Admins can remove admins"
  ON public.admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- 8. Verify the policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'admins';

-- 9. Test query (should work now)
SELECT * FROM public.admins WHERE id = auth.uid();

-- Success message
SELECT 'Admins table RLS policies configured successfully!' as status;
