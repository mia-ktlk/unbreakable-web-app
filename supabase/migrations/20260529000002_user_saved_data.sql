-- Per-user saved favorites and scan history (keyed by badge ID).
-- Run in Supabase SQL Editor after the profile_overrides migration.

create table if not exists public.user_saved_data (
  badge_id text primary key references public.allowed_badges (badge_id) on delete cascade,
  favorite_speakers jsonb not null default '[]'::jsonb,
  favorite_sessions jsonb not null default '[]'::jsonb,
  favorite_sponsors jsonb not null default '[]'::jsonb,
  favorite_exhibitors jsonb not null default '[]'::jsonb,
  scans jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_saved_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_saved_data_updated_at on public.user_saved_data;

create trigger user_saved_data_updated_at
before update on public.user_saved_data
for each row execute function public.set_user_saved_data_updated_at();

alter table public.user_saved_data enable row level security;

drop policy if exists "No direct client access to user saved data" on public.user_saved_data;
create policy "No direct client access to user saved data"
on public.user_saved_data
for all
to anon, authenticated
using (false)
with check (false);
