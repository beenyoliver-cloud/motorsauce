-- Add watch parts and user todos functionality
-- Run this in Supabase SQL Editor

-- 1. Create watched_parts table for garage vehicle part alerts
CREATE TABLE IF NOT EXISTS public.watched_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate watches for same vehicle
  UNIQUE(user_id, make, model, year)
);

-- 2. Create user_todos table for task management
CREATE TABLE IF NOT EXISTS public.user_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_watched_parts_user_id ON public.watched_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_parts_vehicle ON public.watched_parts(make, model, year);
CREATE INDEX IF NOT EXISTS idx_user_todos_user_id ON public.user_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_todos_completed ON public.user_todos(user_id, completed);

-- 4. Enable Row Level Security
ALTER TABLE public.watched_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_todos ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for watched_parts
-- Users can only see their own watched parts
CREATE POLICY "Users can view their own watched parts"
  ON public.watched_parts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own watched parts
CREATE POLICY "Users can create their own watched parts"
  ON public.watched_parts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watched parts
CREATE POLICY "Users can delete their own watched parts"
  ON public.watched_parts
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for user_todos
-- Users can view their own todos
CREATE POLICY "Users can view their own todos"
  ON public.user_todos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own todos
CREATE POLICY "Users can create their own todos"
  ON public.user_todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own todos
CREATE POLICY "Users can update their own todos"
  ON public.user_todos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own todos
CREATE POLICY "Users can delete their own todos"
  ON public.user_todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Function to get matching listings for watched parts
CREATE OR REPLACE FUNCTION get_watched_parts_matches(p_user_id UUID)
RETURNS TABLE (
  watch_id UUID,
  make TEXT,
  model TEXT,
  year INTEGER,
  matching_count BIGINT,
  latest_listing_id TEXT,
  latest_listing_title TEXT,
  latest_listing_created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to query their own watches
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    wp.id AS watch_id,
    wp.make,
    wp.model,
    wp.year,
    COUNT(l.id) AS matching_count,
    (ARRAY_AGG(l.id ORDER BY l.created_at DESC))[1] AS latest_listing_id,
    (ARRAY_AGG(l.title ORDER BY l.created_at DESC))[1] AS latest_listing_title,
    MAX(l.created_at) AS latest_listing_created_at
  FROM public.watched_parts wp
  LEFT JOIN public.listings l 
    ON l.make = wp.make 
    AND l.model = wp.model 
    AND l.year = wp.year
    AND l.deleted_at IS NULL
  WHERE wp.user_id = p_user_id
  GROUP BY wp.id, wp.make, wp.model, wp.year
  ORDER BY matching_count DESC, wp.created_at DESC;
END;
$$;

-- 8. Add updated_at trigger for watched_parts
CREATE OR REPLACE FUNCTION update_watched_parts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_watched_parts_timestamp
  BEFORE UPDATE ON public.watched_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_watched_parts_timestamp();

-- 9. Add updated_at trigger for user_todos
CREATE OR REPLACE FUNCTION update_user_todos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_todos_timestamp
  BEFORE UPDATE ON public.user_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_user_todos_timestamp();

-- Verification queries
SELECT 'watched_parts table created' as status, COUNT(*) as row_count FROM public.watched_parts;
SELECT 'user_todos table created' as status, COUNT(*) as row_count FROM public.user_todos;
