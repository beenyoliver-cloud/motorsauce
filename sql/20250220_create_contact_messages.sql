-- Stores inbound contact form submissions
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  created_at timestamptz not null default now(),
  handled boolean not null default false,
  handled_by uuid references profiles (id),
  handled_at timestamptz
);

create index if not exists idx_contact_messages_handled on contact_messages (handled, created_at desc);
