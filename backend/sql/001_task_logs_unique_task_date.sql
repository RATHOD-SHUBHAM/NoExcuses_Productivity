-- Optional: enforce one row per (task_id, date) in task_logs (matches app rules).
-- Run in Supabase SQL Editor. If duplicate pairs already exist, fix data first.

create unique index if not exists task_logs_task_id_date_unique
  on public.task_logs (task_id, date);
