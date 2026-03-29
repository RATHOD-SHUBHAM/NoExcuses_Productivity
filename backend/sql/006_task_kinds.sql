-- Daily vs monthly-scoped tasks. Run after 005_user_isolation.sql in Supabase SQL Editor.
-- Monthly goals use the same task_logs table for daily completion; month_bucket is the first
-- day of the calendar month that goal belongs to.

begin;

alter table public.tasks
  add column if not exists task_kind text not null default 'daily';

alter table public.tasks
  add column if not exists month_bucket date null;

alter table public.tasks
  drop constraint if exists tasks_task_kind_check;
alter table public.tasks
  add constraint tasks_task_kind_check check (task_kind in ('daily', 'monthly'));

alter table public.tasks
  drop constraint if exists tasks_month_bucket_consistency;
alter table public.tasks
  add constraint tasks_month_bucket_consistency check (
    (task_kind = 'daily' and month_bucket is null)
    or (task_kind = 'monthly' and month_bucket is not null)
  );

commit;
