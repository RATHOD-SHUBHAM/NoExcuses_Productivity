-- Optional notes for an upcoming weekend (Saturday = anchor). Run in Supabase SQL Editor after 007.

create table if not exists public.weekend_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  weekend_start date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekend_start)
);

create index if not exists idx_weekend_plans_user_weekend
  on public.weekend_plans (user_id, weekend_start);

alter table public.weekend_plans enable row level security;

drop policy if exists "weekend_plans_select_own" on public.weekend_plans;
drop policy if exists "weekend_plans_insert_own" on public.weekend_plans;
drop policy if exists "weekend_plans_update_own" on public.weekend_plans;
drop policy if exists "weekend_plans_delete_own" on public.weekend_plans;

create policy "weekend_plans_select_own" on public.weekend_plans
  for select using (auth.uid() = user_id);
create policy "weekend_plans_insert_own" on public.weekend_plans
  for insert with check (auth.uid() = user_id);
create policy "weekend_plans_update_own" on public.weekend_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekend_plans_delete_own" on public.weekend_plans
  for delete using (auth.uid() = user_id);
