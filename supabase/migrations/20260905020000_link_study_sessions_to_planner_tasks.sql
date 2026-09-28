alter table public.study_sessions
  add column if not exists planner_task_id uuid
    references public.study_plan_tasks(id) on delete set null;

create index if not exists study_sessions_planner_task_id_idx
  on public.study_sessions (planner_task_id);

drop policy if exists "Users can create their own study sessions"
  on public.study_sessions;
drop policy if exists "Users can update their own study sessions"
  on public.study_sessions;

create policy "Users can create their own study sessions"
  on public.study_sessions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      planner_task_id is null
      or exists (
        select 1 from public.study_plan_tasks
        where study_plan_tasks.id = study_sessions.planner_task_id
          and study_plan_tasks.user_id = (select auth.uid())
      )
    )
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = study_sessions.class_id
          and classes.user_id = (select auth.uid())
      )
    )
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments
        where assignments.id = study_sessions.assignment_id
          and assignments.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can update their own study sessions"
  on public.study_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      planner_task_id is null
      or exists (
        select 1 from public.study_plan_tasks
        where study_plan_tasks.id = study_sessions.planner_task_id
          and study_plan_tasks.user_id = (select auth.uid())
      )
    )
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = study_sessions.class_id
          and classes.user_id = (select auth.uid())
      )
    )
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments
        where assignments.id = study_sessions.assignment_id
          and assignments.user_id = (select auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
