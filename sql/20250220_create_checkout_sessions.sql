-- Stores pending Stripe checkout sessions so we can create orders after payment succeeds
create table if not exists checkout_sessions (
  session_id text primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  order_id uuid
);

create index if not exists idx_checkout_sessions_user_id on checkout_sessions (user_id);
