-- Day-scoped daily todos: only appear on one calendar day (today’s plan). NULL = recurring habit (every day).
-- Run in Supabase SQL Editor after 006_task_kinds.sql and 007_task_time_windows.sql (if used).

begin;

alter table public.tasks
  add column if not exists daily_for_date date null;

alter table public.tasks
  drop constraint if exists tasks_daily_for_date_monthly_null;
alter table public.tasks
  add constraint tasks_daily_for_date_monthly_null check (
    task_kind <> 'monthly' or daily_for_date is null
  );

commit;
