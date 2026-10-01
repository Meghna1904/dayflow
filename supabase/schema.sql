-- Run this in Supabase SQL Editor.
-- RLS keeps every user's Dayflow data private to that user.

create table if not exists public.dayflow_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.dayflow_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  completed text[] not null default '{}',
  activities jsonb not null default '[]'::jsonb,
  water integer not null default 0 check (water >= 0),
  bathroom integer not null default 0 check (bathroom >= 0),
  bathroom_detail jsonb,
  screen jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.dayflow_vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 4000),
  category text not null,
  created_at timestamptz not null default now()
);

alter table public.dayflow_profiles enable row level security;
alter table public.dayflow_days enable row level security;
alter table public.dayflow_vault_items enable row level security;

drop policy if exists "Users manage their profile" on public.dayflow_profiles;
create policy "Users manage their profile" on public.dayflow_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their days" on public.dayflow_days;
create policy "Users manage their days" on public.dayflow_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their vault" on public.dayflow_vault_items;
create policy "Users manage their vault" on public.dayflow_vault_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
