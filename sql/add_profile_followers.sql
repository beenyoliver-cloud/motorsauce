-- Adds profile follow relationships for public profiles.
--
-- Table used by:
-- - src/app/api/profile/follow/route.ts  (reads/writes profile_followers)
--
-- Notes:
-- - We keep a simple edge table (follower_id -> following_id)
-- - Counts can be derived with COUNT(*); add indexes for performance
-- - RLS allows:
--   * anyone to read follower relationships (public social graph)
--   * authenticated users to follow/unfollow as themselves

begin;

create extension if not exists pgcrypto;

create table if not exists public.profile_followers (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint profile_followers_pkey primary key (follower_id, following_id),
  constraint profile_followers_no_self_follow check (follower_id <> following_id)
);

-- Helpful indexes for lookups + counts
create index if not exists profile_followers_following_id_idx
  on public.profile_followers (following_id, created_at desc);

create index if not exists profile_followers_follower_id_idx
  on public.profile_followers (follower_id, created_at desc);

alter table public.profile_followers enable row level security;

-- Public read access (for showing counts / follow state)
-- If you want this private later, remove this policy.
drop policy if exists "profile_followers_select_public" on public.profile_followers;
create policy "profile_followers_select_public"
  on public.profile_followers
  for select
  using (true);

-- Only the authenticated user can create a row where follower_id = auth.uid()
drop policy if exists "profile_followers_insert_self" on public.profile_followers;
create policy "profile_followers_insert_self"
  on public.profile_followers
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and follower_id = auth.uid()
  );

-- Only the authenticated user can delete their own following relation
drop policy if exists "profile_followers_delete_self" on public.profile_followers;
create policy "profile_followers_delete_self"
  on public.profile_followers
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and follower_id = auth.uid()
  );

commit;
