-- Create persistent tables for Garage vehicles and reminders
-- NOTE: This is for PERSONAL users only, not business accounts

-- Vehicles table (personal users only)
CREATE TABLE IF NOT EXISTS garage_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  image TEXT,
  photos JSONB DEFAULT '[]',
  color TEXT,
  registration TEXT,
  hide_registration BOOLEAN DEFAULT false,
  vin TEXT,
  trim TEXT,
  mileage INTEGER,
  mot_expiry DATE,
  mot_reminder BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  insurance_reminder BOOLEAN DEFAULT false,
  last_service DATE,
  last_service_mileage INTEGER,
  notes TEXT,
  service_history JSONB DEFAULT '[]',
  watch_parts BOOLEAN DEFAULT false,
  for_sale BOOLEAN DEFAULT false,
  hide_mileage BOOLEAN DEFAULT false,
  hide_service_history BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_garage_user ON garage_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_garage_make_model_year ON garage_vehicles(make, model, year);

-- Reminders table
CREATE TABLE IF NOT EXISTS garage_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mot', 'insurance', 'service')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user ON garage_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON garage_reminders(scheduled_for) WHERE NOT sent;

-- Ensure garage is only for personal users (not businesses)
-- Add check constraint to prevent business accounts from using garage
ALTER TABLE garage_vehicles 
ADD CONSTRAINT garage_personal_users_only 
CHECK (
  NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = garage_vehicles.user_id 
    AND profiles.is_business = true
  )
);
