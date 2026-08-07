drop policy if exists "Users can view their own planner tasks"
  on public.study_plan_tasks;
drop policy if exists "Users can create their own planner tasks"
  on public.study_plan_tasks;
drop policy if exists "Users can update their own planner tasks"
  on public.study_plan_tasks;
drop policy if exists "Users can delete their own planner tasks"
  on public.study_plan_tasks;

create policy "Users can view their own planner tasks"
  on public.study_plan_tasks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own planner tasks"
  on public.study_plan_tasks
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = study_plan_tasks.class_id
          and classes.user_id = (select auth.uid())
      )
    )
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments
        where assignments.id = study_plan_tasks.assignment_id
          and assignments.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can update their own planner tasks"
  on public.study_plan_tasks
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1 from public.classes
        where classes.id = study_plan_tasks.class_id
          and classes.user_id = (select auth.uid())
      )
    )
    and (
      assignment_id is null
      or exists (
        select 1 from public.assignments
        where assignments.id = study_plan_tasks.assignment_id
          and assignments.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can delete their own planner tasks"
  on public.study_plan_tasks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own study sessions"
  on public.study_sessions;
drop policy if exists "Users can create their own study sessions"
  on public.study_sessions;
drop policy if exists "Users can update their own study sessions"
  on public.study_sessions;
drop policy if exists "Users can delete their own study sessions"
  on public.study_sessions;

create policy "Users can view their own study sessions"
  on public.study_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own study sessions"
  on public.study_sessions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
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

create policy "Users can delete their own study sessions"
  on public.study_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists study_plan_tasks_class_id_idx
  on public.study_plan_tasks (class_id);
create index if not exists study_sessions_class_id_idx
  on public.study_sessions (class_id);
create index if not exists study_sessions_assignment_id_idx
  on public.study_sessions (assignment_id);

notify pgrst, 'reload schema';
