-- Migrate data from old columns (starter, recipient) to new columns (starter_id, recipient_id)
-- The columns already exist but are empty - we need to copy the data

-- Copy data from old columns to new columns
UPDATE public.offers
SET 
  starter_id = starter,
  recipient_id = recipient
WHERE starter_id IS NULL OR recipient_id IS NULL;

-- Verify the migration worked
SELECT 
  id,
  starter,
  starter_id,
  recipient,
  recipient_id,
  CASE 
    WHEN starter = starter_id AND recipient = recipient_id THEN '✅ Match'
    WHEN starter_id IS NULL OR recipient_id IS NULL THEN '❌ NULL values'
    ELSE '⚠️  Mismatch'
  END as status
FROM public.offers
LIMIT 10;
