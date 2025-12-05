-- Fix offers table structure if columns are missing
-- Run this in Supabase SQL Editor if diagnostic shows missing columns

-- Add missing columns if they don't exist
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS counter_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.threads(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_offers_thread_id ON public.offers(thread_id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'offers' 
AND table_schema = 'public'
AND column_name IN ('responded_at', 'counter_amount', 'thread_id')
ORDER BY column_name;
