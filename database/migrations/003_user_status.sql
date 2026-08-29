-- Access requests: new users stay pending until an admin approves them.
-- Existing rows default to active, so current team members keep access.

alter table public.users
  add column if not exists status text not null default 'active';

alter table public.users
  drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check
  check (status in ('pending', 'active', 'rejected'));

create index if not exists idx_users_status on public.users (status);
