-- Weekly reflection + intentional rest days + RLS (run in Supabase SQL Editor after 001/002).

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  what_worked text not null default '',
  what_to_improve text not null default '',
  what_to_drop text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_start)
);

create table if not exists public.rest_days (
  date date primary key
);

create index if not exists idx_weekly_reviews_week_start on public.weekly_reviews (week_start);

alter table public.weekly_reviews enable row level security;
alter table public.rest_days enable row level security;

drop policy if exists "weekly_reviews_allow_all" on public.weekly_reviews;
create policy "weekly_reviews_allow_all" on public.weekly_reviews
  for all using (true) with check (true);

drop policy if exists "rest_days_allow_all" on public.rest_days;
create policy "rest_days_allow_all" on public.rest_days
  for all using (true) with check (true);
