-- Add about/bio column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS about TEXT;

COMMENT ON COLUMN public.profiles.about IS 'User bio/about text (max 500 characters)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('about', 'avatar', 'background_image')
ORDER BY column_name;
