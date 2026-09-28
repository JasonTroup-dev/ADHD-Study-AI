-- Preserve legacy elapsed durations for review without treating them as study time.
alter table public.study_sessions
  add column time_confirmed_at timestamptz;

alter table public.study_sessions
  add constraint study_sessions_confirmed_minutes_check
  check (time_confirmed_at is null or
    (actual_minutes is not null and actual_minutes between 0 and 1440));

comment on column public.study_sessions.time_confirmed_at is
  'Set when the learner explicitly logs study minutes. NULL means time is unverified or not logged.';
