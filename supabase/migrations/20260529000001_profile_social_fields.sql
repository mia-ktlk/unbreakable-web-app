-- Add social media fields to profile overrides.
-- Run in Supabase SQL Editor if you already applied the initial migration.

alter table public.profile_overrides
  add column if not exists instagram text,
  add column if not exists facebook text,
  add column if not exists linkedin text;
