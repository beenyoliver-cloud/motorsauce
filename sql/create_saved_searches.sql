-- Create saved_searches table for users to save their search criteria
-- Allows users to quickly re-run searches and get notifications for new matches

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Search criteria (stored as JSON for flexibility)
  name TEXT NOT NULL, -- User-given name for the search
  filters JSONB NOT NULL DEFAULT '{}', -- Search filters: category, make, model, price_min, price_max, etc.
  
  -- Notification settings
  notify_new_matches BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_filters ON public.saved_searches USING GIN(filters);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER set_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view their saved searches"
  ON public.saved_searches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create saved searches
CREATE POLICY "Users can create saved searches"
  ON public.saved_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their saved searches
CREATE POLICY "Users can update their saved searches"
  ON public.saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their saved searches
CREATE POLICY "Users can delete their saved searches"
  ON public.saved_searches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.saved_searches IS 'User saved search criteria for quick access and notifications';
COMMENT ON COLUMN public.saved_searches.filters IS 'JSONB object with search parameters: category, make, model, price_min, price_max, condition, etc.';
COMMENT ON COLUMN public.saved_searches.notify_new_matches IS 'Whether to notify user when new listings match this search';
