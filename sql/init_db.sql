-- Drop existing objects if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop existing tables and their dependent objects
drop table if exists public.favorites cascade;
drop table if exists public.offers cascade;
drop table if exists public.messages cascade;
drop table if exists public.threads cascade;
drop table if exists public.listings cascade;
drop table if exists public.profiles cascade;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users(id) primary key,
  name text not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint profiles_name_key unique (name)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create profiles policies
create policy "Public profiles are viewable by everyone." 
  on public.profiles
  for select using (true);

create policy "Users can insert their own profile." 
  on public.profiles 
  for insert 
  with check (auth.uid() = id);

create policy "Users can update their own profile."
  on public.profiles
  for update using (auth.uid() = id);

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Set up trigger for new users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create listings table
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  price decimal(10,2) not null,
  condition text,
  category text,
  make text,
  model text,
  year integer,
  images jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create threads table
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  a_user uuid references public.profiles(id) not null,
  b_user uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads(id) not null,
  sender uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create offers table
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) not null,
  starter uuid references public.profiles(id) not null,
  recipient uuid references public.profiles(id) not null,
  amount decimal(10,2) not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create favorites table
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, listing_id)
);

-- Set up Row Level Security (RLS) for all tables
alter table public.listings enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.favorites enable row level security;

-- Create RLS policies for listings
create policy "Listings are viewable by everyone."
  on public.listings for select
  using (true);

create policy "Users can create their own listings."
  on public.listings for insert
  with check (auth.uid() = seller_id);

create policy "Users can update their own listings."
  on public.listings for update
  using (auth.uid() = seller_id);

-- Create RLS policies for threads
create policy "Users can view their own threads."
  on public.threads for select
  using (auth.uid() = a_user or auth.uid() = b_user);

create policy "Users can create threads."
  on public.threads for insert
  with check (auth.uid() in (a_user, b_user));

-- Create RLS policies for messages
create policy "Users can view messages in their threads."
  on public.messages for select
  using (
    exists (
      select 1 from public.threads
      where id = messages.thread_id
      and (auth.uid() = a_user or auth.uid() = b_user)
    )
  );

create policy "Users can insert messages in their threads."
  on public.messages for insert
  with check (
    auth.uid() = sender
    and exists (
      select 1 from public.threads
      where id = thread_id
      and (auth.uid() = a_user or auth.uid() = b_user)
    )
  );

-- Create RLS policies for offers
create policy "Users can view offers they're involved in."
  on public.offers for select
  using (auth.uid() in (starter, recipient));

create policy "Users can create offers."
  on public.offers for insert
  with check (auth.uid() = starter);

create policy "Users can update their received offers."
  on public.offers for update
  using (auth.uid() = recipient);

-- Create RLS policies for favorites
create policy "Users can view their own favorites."
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can create their own favorites."
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorites."
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Create admins table
create table public.admins (
  id uuid references public.profiles(id) primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on admins table
alter table public.admins enable row level security;

-- Allow users to check if they themselves are admins (this policy allows the check to work)
create policy "Users can check if they are admin."
  on public.admins for select
  using (auth.uid() = id);

-- Create an admin user through Supabase auth API
-- Note: You'll need to use the Supabase dashboard or auth.sign_up() function
-- to create the initial admin user, as direct password insertion is not recommended

-- This comment serves as a reminder of the admin credentials to use:
-- Email: admin@motorsauce.dev
-- Password: adminpass123

-- Add a policy to allow admins to insert other admins
create policy "Admins can insert other admins."
  on public.admins
  for insert
  with check (auth.uid() in (select id from public.admins));

-- Create audit_logs table to track key actions
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- Policy: Only admins can view audit logs
create policy "Admins can view audit logs."
  on public.audit_logs for select
  using (auth.uid() in (select id from public.admins));