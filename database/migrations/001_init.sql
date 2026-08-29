-- Meeting OS — initial schema
-- Run this in the Supabase SQL editor (or via scripts/migrate.ts).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  telegram_username text,
  first_name text,
  last_name text,
  display_name text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  title text not null,
  meeting_date date not null,
  start_time time,
  end_time time,
  meeting_link text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  source text not null default 'manual' check (source in ('manual', 'xlsx')),
  source_import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- meeting_participants
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  attendance_status text check (attendance_status in ('going', 'not_going', 'maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

-- ---------------------------------------------------------------------------
-- agenda_items
-- Who / responsible_text is free text from Excel. It never references users.
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  topic text not null,
  start_time time,
  end_time time,
  responsible_text text,
  outcome_expected text,
  sort_order integer not null default 0,
  source_row_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- meeting_minutes
-- ---------------------------------------------------------------------------
create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid unique not null references public.meetings(id) on delete cascade,
  summary text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- decisions
-- ---------------------------------------------------------------------------
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- action_items
-- owner_id is a Mini App user, never an Excel "Who" value.
-- ---------------------------------------------------------------------------
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references public.users(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- imports
-- preview_data stores the parsed preview before confirm.
-- error_log stores validation errors / warnings / apply errors.
-- ---------------------------------------------------------------------------
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  filename text,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'pending',
  rows_total integer,
  meetings_created integer default 0,
  meetings_updated integer default 0,
  agenda_items_created integer default 0,
  rows_failed integer default 0,
  error_log jsonb,
  preview_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.meetings
  drop constraint if exists meetings_source_import_id_fkey;

alter table public.meetings
  add constraint meetings_source_import_id_fkey
  foreign key (source_import_id) references public.imports(id) on delete set null;

create index if not exists idx_meetings_date on public.meetings (meeting_date);
create index if not exists idx_meetings_external_id on public.meetings (external_id);
create index if not exists idx_agenda_meeting on public.agenda_items (meeting_id, sort_order);
create index if not exists idx_participants_meeting on public.meeting_participants (meeting_id);
create index if not exists idx_participants_user on public.meeting_participants (user_id);
create index if not exists idx_actions_owner on public.action_items (owner_id, status);
create index if not exists idx_actions_meeting on public.action_items (meeting_id);
create index if not exists idx_users_telegram_id on public.users (telegram_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists set_meetings_updated_at on public.meetings;
create trigger set_meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

drop trigger if exists set_participants_updated_at on public.meeting_participants;
create trigger set_participants_updated_at before update on public.meeting_participants
  for each row execute function public.set_updated_at();

drop trigger if exists set_agenda_updated_at on public.agenda_items;
create trigger set_agenda_updated_at before update on public.agenda_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_minutes_updated_at on public.meeting_minutes;
create trigger set_minutes_updated_at before update on public.meeting_minutes
  for each row execute function public.set_updated_at();

drop trigger if exists set_decisions_updated_at on public.decisions;
create trigger set_decisions_updated_at before update on public.decisions
  for each row execute function public.set_updated_at();

drop trigger if exists set_actions_updated_at on public.action_items;
create trigger set_actions_updated_at before update on public.action_items
  for each row execute function public.set_updated_at();
