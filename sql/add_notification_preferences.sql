-- Add notification preference columns to profiles table
-- Stores user preferences for different types of notifications

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS marketing_notifications BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN profiles.email_notifications IS 'Whether user wants to receive general email notifications';
COMMENT ON COLUMN profiles.message_notifications IS 'Whether user wants to receive alerts for new messages';
COMMENT ON COLUMN profiles.marketing_notifications IS 'Whether user wants to receive marketing updates and offers';
