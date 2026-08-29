-- RLS is enabled so the anon key cannot read or write application data.
-- The Mini App talks to Next.js API routes, which use the service role key
-- and enforce Telegram initData + role checks on the server.

alter table public.users enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.agenda_items enable row level security;
alter table public.meeting_minutes enable row level security;
alter table public.decisions enable row level security;
alter table public.action_items enable row level security;
alter table public.imports enable row level security;

-- No policies for anon/authenticated: all access goes through the service role.
-- Service role bypasses RLS.
