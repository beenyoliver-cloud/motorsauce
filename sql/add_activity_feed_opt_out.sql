-- Add show_in_activity_feed column for business accounts to opt-out of appearing in public activity feeds
-- Run this in Supabase SQL Editor

-- Add the column with default TRUE (show by default)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_in_activity_feed BOOLEAN DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.show_in_activity_feed IS 'Whether this user''s activity (listings, sales) should appear in public feeds. Primarily used by business accounts for privacy.';

-- Update RLS to allow users to read/update their own show_in_activity_feed setting
-- (This should already be covered by existing RLS policies that allow users to update their own profile)
