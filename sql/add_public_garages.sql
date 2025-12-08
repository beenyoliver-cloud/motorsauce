-- Create public_garages table to store user garages
CREATE TABLE IF NOT EXISTS public_garages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  cars jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_car_id text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id),
  UNIQUE(username)
);

-- Enable RLS
ALTER TABLE public_garages ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own garage
CREATE POLICY "Users can read own garage"
  ON public_garages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own garage
CREATE POLICY "Users can insert own garage"
  ON public_garages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own garage
CREATE POLICY "Users can update own garage"
  ON public_garages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own garage
CREATE POLICY "Users can delete own garage"
  ON public_garages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anyone to read public garages
CREATE POLICY "Anyone can read public garages"
  ON public_garages
  FOR SELECT
  USING (is_public = true);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_public_garages_username ON public_garages(username);
CREATE INDEX IF NOT EXISTS idx_public_garages_user_id ON public_garages(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_public_garages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_public_garages_updated_at
  BEFORE UPDATE ON public_garages
  FOR EACH ROW
  EXECUTE FUNCTION update_public_garages_updated_at();
