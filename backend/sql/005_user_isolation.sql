-- Per-user isolation (auth.uid()). Run after 004_task_rest_days.sql in Supabase SQL Editor.
--
-- WARNING: TRUNCATE removes all habits, logs, reviews, and rest rows. Existing single-tenant
-- data is wiped. Enable Email (or your provider) under Authentication → Providers first.
--
-- After this migration, the FastAPI app must call PostgREST with the end-user JWT and the
-- anon/publishable key (not the service_role key). Set SUPABASE_JWT_SECRET on the API host.

begin;

truncate table public.task_rest_days restart identity cascade;
truncate table public.task_logs restart identity cascade;
truncate table public.tasks restart identity cascade;
truncate table public.weekly_reviews restart identity cascade;
truncate table public.rest_days restart identity cascade;

-- tasks: owner (tables are empty after TRUNCATE; defaults apply on API inserts via JWT)
alter table public.tasks
  add column if not exists user_id uuid references auth.users (id);
alter table public.tasks alter column user_id set default auth.uid();
alter table public.tasks alter column user_id set not null;

-- weekly_reviews: one row per user per week
alter table public.weekly_reviews drop constraint if exists weekly_reviews_week_start_key;
alter table public.weekly_reviews
  add column if not exists user_id uuid references auth.users (id);
alter table public.weekly_reviews alter column user_id set default auth.uid();
alter table public.weekly_reviews alter column user_id set not null;
drop index if exists public.weekly_reviews_user_week;
create unique index weekly_reviews_user_week on public.weekly_reviews (user_id, week_start);

-- rest_days: primary key (user_id, date)
alter table public.rest_days drop constraint if exists rest_days_pkey;
alter table public.rest_days
  add column if not exists user_id uuid references auth.users (id);
alter table public.rest_days alter column user_id set default auth.uid();
alter table public.rest_days alter column user_id set not null;
alter table public.rest_days add primary key (user_id, date);

-- RLS: drop open dev policies
drop policy if exists "tasks_allow_all" on public.tasks;
drop policy if exists "task_logs_allow_all" on public.task_logs;
drop policy if exists "weekly_reviews_allow_all" on public.weekly_reviews;
drop policy if exists "rest_days_allow_all" on public.rest_days;
drop policy if exists "task_rest_days_allow_all" on public.task_rest_days;

-- tasks
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- task_logs (via task ownership)
drop policy if exists "task_logs_select_own" on public.task_logs;
drop policy if exists "task_logs_insert_own" on public.task_logs;
drop policy if exists "task_logs_update_own" on public.task_logs;
drop policy if exists "task_logs_delete_own" on public.task_logs;
create policy "task_logs_select_own" on public.task_logs
  for select using (
    exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.user_id = auth.uid())
  );
create policy "task_logs_insert_own" on public.task_logs
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.user_id = auth.uid())
  );
create policy "task_logs_update_own" on public.task_logs
  for update using (
    exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.user_id = auth.uid())
  );
create policy "task_logs_delete_own" on public.task_logs
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_logs.task_id and t.user_id = auth.uid())
  );

-- weekly_reviews
drop policy if exists "weekly_reviews_select_own" on public.weekly_reviews;
drop policy if exists "weekly_reviews_insert_own" on public.weekly_reviews;
drop policy if exists "weekly_reviews_update_own" on public.weekly_reviews;
drop policy if exists "weekly_reviews_delete_own" on public.weekly_reviews;
create policy "weekly_reviews_select_own" on public.weekly_reviews
  for select using (auth.uid() = user_id);
create policy "weekly_reviews_insert_own" on public.weekly_reviews
  for insert with check (auth.uid() = user_id);
create policy "weekly_reviews_update_own" on public.weekly_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews_delete_own" on public.weekly_reviews
  for delete using (auth.uid() = user_id);

-- rest_days
drop policy if exists "rest_days_select_own" on public.rest_days;
drop policy if exists "rest_days_insert_own" on public.rest_days;
drop policy if exists "rest_days_update_own" on public.rest_days;
drop policy if exists "rest_days_delete_own" on public.rest_days;
create policy "rest_days_select_own" on public.rest_days
  for select using (auth.uid() = user_id);
create policy "rest_days_insert_own" on public.rest_days
  for insert with check (auth.uid() = user_id);
create policy "rest_days_update_own" on public.rest_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rest_days_delete_own" on public.rest_days
  for delete using (auth.uid() = user_id);

-- task_rest_days
drop policy if exists "task_rest_days_select_own" on public.task_rest_days;
drop policy if exists "task_rest_days_insert_own" on public.task_rest_days;
drop policy if exists "task_rest_days_update_own" on public.task_rest_days;
drop policy if exists "task_rest_days_delete_own" on public.task_rest_days;
create policy "task_rest_days_select_own" on public.task_rest_days
  for select using (
    exists (select 1 from public.tasks t where t.id = task_rest_days.task_id and t.user_id = auth.uid())
  );
create policy "task_rest_days_insert_own" on public.task_rest_days
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_rest_days.task_id and t.user_id = auth.uid())
  );
create policy "task_rest_days_update_own" on public.task_rest_days
  for update using (
    exists (select 1 from public.tasks t where t.id = task_rest_days.task_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tasks t where t.id = task_rest_days.task_id and t.user_id = auth.uid())
  );
create policy "task_rest_days_delete_own" on public.task_rest_days
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_rest_days.task_id and t.user_id = auth.uid())
  );

commit;
