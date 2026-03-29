-- Optional local time window for daily habits (HH:MM 24h). Run in Supabase SQL Editor after 006.

alter table public.tasks
  add column if not exists window_start text null;

alter table public.tasks
  add column if not exists window_end text null;

comment on column public.tasks.window_start is 'Optional planned start (HH:MM local) for daily tasks';
comment on column public.tasks.window_end is 'Optional planned end (HH:MM local) for daily tasks';
