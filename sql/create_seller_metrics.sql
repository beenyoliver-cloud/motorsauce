-- Create seller_metrics table used to track popularity
create table if not exists seller_metrics (
  seller_name text primary key,
  avatar text,
  clicks bigint default 0,
  last_clicked timestamptz
);

-- Optional: grant access or add policies if using RLS
-- alter table seller_metrics enable row level security;
