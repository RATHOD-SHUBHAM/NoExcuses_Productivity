-- Per-task rest days (streak bridging for one habit only). Run after 003_productivity_features.sql.

create table if not exists public.task_rest_days (
  task_id uuid not null references public.tasks (id) on delete cascade,
  date date not null,
  primary key (task_id, date)
);

create index if not exists idx_task_rest_days_date on public.task_rest_days (date);

alter table public.task_rest_days enable row level security;

drop policy if exists "task_rest_days_allow_all" on public.task_rest_days;
create policy "task_rest_days_allow_all" on public.task_rest_days
  for all using (true) with check (true);
