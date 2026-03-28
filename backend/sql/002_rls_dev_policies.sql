-- DEV ONLY: allow anon/authenticated PostgREST access when you refuse to use service_role.
-- Prefer SUPABASE_SERVICE_ROLE_KEY in .env for the FastAPI backend instead.
-- Run in Supabase SQL Editor. Adjust policy names if they already exist.

alter table public.tasks enable row level security;
alter table public.task_logs enable row level security;

drop policy if exists "tasks_allow_all" on public.tasks;
create policy "tasks_allow_all" on public.tasks
  for all
  using (true)
  with check (true);

drop policy if exists "task_logs_allow_all" on public.task_logs;
create policy "task_logs_allow_all" on public.task_logs
  for all
  using (true)
  with check (true);
