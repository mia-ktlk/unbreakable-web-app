-- Profile overrides for attendee self-service updates.
-- Run in Supabase SQL Editor, then run supabase/seed/allowed_badges.sql.

create table if not exists public.allowed_badges (
  badge_id text primary key
);

create table if not exists public.profile_overrides (
  badge_id text primary key references public.allowed_badges (badge_id) on delete cascade,
  email text,
  phone text,
  website text,
  company text,
  role text,
  instagram text,
  facebook text,
  linkedin text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_profile_overrides_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profile_overrides_updated_at on public.profile_overrides;

create trigger profile_overrides_updated_at
before update on public.profile_overrides
for each row execute function public.set_profile_overrides_updated_at();

alter table public.allowed_badges enable row level security;
alter table public.profile_overrides enable row level security;

drop policy if exists "Public read allowed badges" on public.allowed_badges;
create policy "Public read allowed badges"
on public.allowed_badges
for select
to anon, authenticated
using (true);

drop policy if exists "No direct client writes to allowed badges" on public.allowed_badges;
create policy "No direct client writes to allowed badges"
on public.allowed_badges
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Public read profile overrides" on public.profile_overrides;
create policy "Public read profile overrides"
on public.profile_overrides
for select
to anon, authenticated
using (true);

drop policy if exists "No direct client writes to profile overrides" on public.profile_overrides;
create policy "No direct client writes to profile overrides"
on public.profile_overrides
for all
to anon, authenticated
using (false)
with check (false);
