-- Create price_history table to track listing price changes over time
-- Allows showing "Price Reduced" badges and price trend charts

CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Price tracking (using decimal to match listings.price column)
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2) NOT NULL,
  change_percentage NUMERIC(5, 2), -- Percentage change (e.g., -15.50 for 15.5% reduction)
  
  -- Change metadata
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason TEXT, -- Optional: "Price drop sale", "Negotiation", etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON public.price_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_change_percentage ON public.price_history(change_percentage);

-- Function to automatically log price changes
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if price actually changed
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO public.price_history (
      listing_id,
      old_price,
      new_price,
      change_percentage,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.price,
      NEW.price,
      CASE 
        WHEN OLD.price > 0 THEN
          ROUND(((NEW.price - OLD.price) / OLD.price * 100)::numeric, 2)
        ELSE NULL
      END,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on listings table to auto-log price changes
DROP TRIGGER IF EXISTS track_listing_price_changes ON public.listings;
CREATE TRIGGER track_listing_price_changes
  AFTER UPDATE OF price ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- Function to log initial price when listing is created
CREATE OR REPLACE FUNCTION log_initial_price()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.price_history (
    listing_id,
    old_price,
    new_price,
    change_percentage,
    changed_by
  ) VALUES (
    NEW.id,
    NULL, -- No old price for new listings
    NEW.price,
    NULL,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log initial price on insert
DROP TRIGGER IF EXISTS track_listing_initial_price ON public.listings;
CREATE TRIGGER track_listing_initial_price
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION log_initial_price();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view price history (public information)
CREATE POLICY "Price history is public"
  ON public.price_history
  FOR SELECT
  USING (true);

-- Only system can insert (via triggers)
-- No manual inserts or updates allowed

-- View to get latest price reduction for each listing (for badges)
CREATE OR REPLACE VIEW public.latest_price_reductions AS
SELECT DISTINCT ON (listing_id)
  listing_id,
  old_price,
  new_price,
  change_percentage,
  created_at
FROM public.price_history
WHERE old_price IS NOT NULL 
  AND change_percentage < 0 -- Only reductions
  AND created_at > NOW() - INTERVAL '30 days' -- Last 30 days only
ORDER BY listing_id, created_at DESC;

-- Comments for documentation
COMMENT ON TABLE public.price_history IS 'Historical tracking of listing price changes';
COMMENT ON COLUMN public.price_history.old_price IS 'Previous price in GBP (decimal)';
COMMENT ON COLUMN public.price_history.new_price IS 'New price in GBP (decimal)';
COMMENT ON COLUMN public.price_history.change_percentage IS 'Percentage change: negative for price drops, positive for increases';
COMMENT ON VIEW public.latest_price_reductions IS 'Most recent price reduction for each listing (last 30 days)';
