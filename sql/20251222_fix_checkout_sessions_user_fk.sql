-- Fix checkout_sessions.user_id foreign key
--
-- Why: The initial migration references profiles(id). That fails for any authenticated user
-- that doesn't have a corresponding profiles row yet (common for “individual” accounts).
-- Since checkout is tied to the authenticated user, the FK should reference auth.users(id).
--
-- Safe to run multiple times.

alter table if exists checkout_sessions
  drop constraint if exists checkout_sessions_user_id_fkey;

alter table if exists checkout_sessions
  add constraint checkout_sessions_user_id_fkey
  foreign key (user_id) references auth.users (id)
  on delete cascade;
