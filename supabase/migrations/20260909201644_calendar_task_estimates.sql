-- Optional student-entered estimates support calendar workload totals.
-- The earlier time-estimate removal migration leaves existing tasks unknown.
alter table public.study_plan_tasks
  add column estimated_minutes integer,
  add constraint study_plan_tasks_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes between 1 and 1440);

comment on column public.study_plan_tasks.estimated_minutes is
  'Optional student-entered estimate in minutes. NULL means no estimate.';
