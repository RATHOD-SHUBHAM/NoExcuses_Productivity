-- Core tables for NoExcuses (habits + daily logs). Run FIRST in Supabase SQL Editor.
-- After this: run 002_rls_dev_policies.sql, then 003_productivity_features.sql.
-- Skip 001 if this file already defines uniqueness on (task_id, date).

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  date date not null,
  completed boolean not null default false,
  constraint task_logs_task_id_date_unique unique (task_id, date)
);

create index if not exists idx_task_logs_task_id on public.task_logs (task_id);
create index if not exists idx_task_logs_date on public.task_logs (date);
