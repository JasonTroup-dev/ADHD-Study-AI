-- Shared preview snapshots and atomic planner changes. All functions use caller RLS.
alter table public.study_plan_tasks
  add column pinned boolean not null default false,
  add column checklist jsonb not null default '[]'::jsonb;
alter table public.assignments add column deadline_evidence jsonb;

create table public.planner_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"maxTasksPerDay":3,"weekdayCapacity":[3,3,3,3,3,3,3],"unavailableDates":[]}'::jsonb
);
alter table public.planner_preferences enable row level security;
create policy planner_preferences_owner on public.planner_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.planner_preferences to authenticated;

create table public.planner_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('import', 'catch_up', 'restructure', 'undo')),
  changes jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index planner_changes_user_created_idx on public.planner_changes(user_id, created_at desc);
alter table public.planner_changes enable row level security;
create policy planner_changes_owner on public.planner_changes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.planner_changes to authenticated;

create function public.planner_workspace() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with workspace as (
    select jsonb_build_object(
      'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.study_plan_tasks t where t.user_id = auth.uid()), '[]'::jsonb),
      'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due_date', a.due_date, 'status', a.status, 'context_version', a.context_version, 'class_id', a.class_id, 'importance', a.importance) order by a.id) from public.assignments a where a.user_id = auth.uid()), '[]'::jsonb),
      'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'assignment_id', s.assignment_id, 'planner_task_id', s.planner_task_id) order by s.id) from public.study_sessions s where s.user_id = auth.uid()), '[]'::jsonb),
      'preferences', coalesce((select p.settings from public.planner_preferences p where p.user_id = auth.uid()), '{"maxTasksPerDay":3,"weekdayCapacity":[3,3,3,3,3,3,3],"unavailableDates":[]}'::jsonb),
      'lastChangeId', (select c.id from public.planner_changes c where c.user_id = auth.uid() and c.kind in ('catch_up', 'restructure') and c.undone_at is null order by c.created_at desc limit 1)
    ) as body
  ) select body || jsonb_build_object('version', md5(body::text)) from workspace;
$$;
revoke all on function public.planner_workspace() from public, anon;
grant execute on function public.planner_workspace() to authenticated;

create function public.commit_planner_change(p_version text, p_kind text, p_changes jsonb,
  p_preferences jsonb, p_assignments jsonb default '[]'::jsonb, p_class jsonb default null,
  p_undo_id uuid default null) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := auth.uid();
  change_id uuid;
  entry jsonb;
  old_task public.study_plan_tasks;
  new_task public.study_plan_tasks;
  actual_changes jsonb := '[]'::jsonb;
  task_id uuid;
  prior jsonb;
  desired jsonb;
  saved_changes jsonb;
  cap integer;
  day date;
  original_counts jsonb;
begin
  if actor is null then raise exception 'Sign in to update your planner.' using errcode = '42501'; end if;
  if p_kind not in ('import','catch_up','restructure','undo') then raise exception 'Invalid planning action.'; end if;
  -- Serialize planner commits for this student, then lock existing work against edits.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 817));
  perform 1 from public.study_plan_tasks where user_id = actor order by id for update;
  perform 1 from public.assignments where user_id = actor order by id for update;
  if (public.planner_workspace()->>'version') is distinct from p_version then
    raise exception 'Your planner changed. Preview the plan again.' using errcode = '40001';
  end if;
  if p_preferences is null or jsonb_typeof(p_preferences->'weekdayCapacity') is distinct from 'array'
    or jsonb_array_length(p_preferences->'weekdayCapacity') <> 7
    or jsonb_typeof(p_preferences->'unavailableDates') is distinct from 'array'
    or coalesce((p_preferences->>'maxTasksPerDay')::int, 0) not between 1 and 5
    or exists(select 1 from jsonb_array_elements_text(p_preferences->'weekdayCapacity') v where v::int not between 0 and 5)
  then raise exception 'Invalid availability settings.'; end if;
  if p_kind = 'undo' then
    select changes into saved_changes from public.planner_changes
      where id = p_undo_id and user_id = actor and kind in ('catch_up','restructure') and undone_at is null for update;
    if saved_changes is null then raise exception 'This change cannot be undone.' using errcode = '40001'; end if;
    select jsonb_agg(jsonb_build_object('before', e->'after', 'after', e->'before')) into p_changes
      from jsonb_array_elements(saved_changes) e;
  end if;
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) > 500 then raise exception 'Invalid task changes.'; end if;
  if p_kind <> 'import' and (p_class is not null or p_assignments <> '[]'::jsonb) then raise exception 'Only imports can create assignments.'; end if;
  select coalesce(jsonb_object_agg(scheduled_date::text, n), '{}'::jsonb) into original_counts
    from (select scheduled_date, count(*) n from public.study_plan_tasks where user_id = actor group by scheduled_date) counts;
  if p_class is not null then
    insert into public.classes(id,user_id,name,class_code,prof_name,color)
      values ((p_class->>'id')::uuid,actor,p_class->>'name',p_class->>'classCode',p_class->>'professorName',p_class->>'color');
  end if;
  for entry in select value from jsonb_array_elements(p_assignments) loop
    insert into public.assignments(id,user_id,class_id,title,description,due_date,importance,points,status,deadline_evidence)
      values ((entry->>'id')::uuid,actor,(entry->>'class_id')::uuid,entry->>'title',entry->>'description',
        (entry->>'due_date')::date,entry->>'importance',(entry->>'points')::numeric,'not_started',entry->'deadline_evidence');
  end loop;
  for entry in select value from jsonb_array_elements(p_changes) loop
    prior := nullif(entry->'before', 'null'::jsonb);
    desired := nullif(entry->'after', 'null'::jsonb);
    task_id := coalesce((prior->>'id')::uuid, (desired->>'id')::uuid);
    if task_id is null or (prior is null and desired is null) then raise exception 'Invalid task change.'; end if;
    if prior is not null then
      select * into old_task from public.study_plan_tasks where id = task_id and user_id = actor;
      if not found or to_jsonb(old_task) is distinct from prior then
        raise exception 'A task changed. Preview the plan again.' using errcode = '40001';
      end if;
      if p_kind = 'import' or old_task.status <> 'todo' or old_task.pinned or old_task.user_edited
        or old_task.source not in ('generic_generated','context_generated')
        or exists (select 1 from public.study_sessions s where s.user_id = actor and
          (s.planner_task_id = task_id or (s.planner_task_id is null and s.assignment_id = old_task.assignment_id)))
      then raise exception 'Started, completed, pinned, and edited work is protected.' using errcode = '40001'; end if;
    elsif exists(select 1 from public.study_plan_tasks where id = task_id) then
      raise exception 'This task already exists.' using errcode = '40001';
    end if;
    if desired is null then
      delete from public.study_plan_tasks where id = task_id and user_id = actor;
    else
      new_task := jsonb_populate_record(null::public.study_plan_tasks, desired);
      if new_task.id <> task_id or new_task.user_id <> actor or new_task.status <> 'todo'
        or new_task.title is null or length(new_task.title) not between 1 and 180
        or new_task.scheduled_date is null or new_task.pinned or new_task.user_edited
        or jsonb_typeof(new_task.checklist) is distinct from 'array' or jsonb_array_length(new_task.checklist) > 8
      then raise exception 'Invalid proposed task.'; end if;
      if prior is not null and (new_task.assignment_id is distinct from old_task.assignment_id or new_task.class_id is distinct from old_task.class_id) then raise exception 'Task ownership cannot be changed.'; end if;
      if p_kind = 'catch_up' and ((desired - 'scheduled_date') is distinct from (prior - 'scheduled_date')) then raise exception 'Catch-up may only move dates.'; end if;
      if prior is null then
        insert into public.study_plan_tasks(id,user_id,class_id,assignment_id,title,description,scheduled_date,priority,status,source,context_version,user_edited,pinned,checklist,created_at,start_time,end_time,completed_at)
          values (task_id,actor,new_task.class_id,new_task.assignment_id,new_task.title,new_task.description,new_task.scheduled_date,new_task.priority,'todo',new_task.source,new_task.context_version,false,false,new_task.checklist,coalesce(new_task.created_at,now()),new_task.start_time,new_task.end_time,new_task.completed_at);
      else
        update public.study_plan_tasks set title = new_task.title, description = new_task.description,
          scheduled_date = new_task.scheduled_date, priority = new_task.priority, source = new_task.source,
          context_version = new_task.context_version, checklist = new_task.checklist where id = task_id and user_id = actor;
      end if;
      select to_jsonb(t) into desired from public.study_plan_tasks t where t.id = task_id and t.user_id = actor;
    end if;
    actual_changes := actual_changes || jsonb_build_array(jsonb_build_object('before', prior, 'after', desired));
  end loop;
  -- An explicit undo can restore an old overdue date. New plans may never add overload.
  if p_kind <> 'undo' then
    for day in select distinct (e->'after'->>'scheduled_date')::date from jsonb_array_elements(actual_changes) e where e->'after' <> 'null'::jsonb loop
      cap := least((p_preferences->>'maxTasksPerDay')::int, (p_preferences->'weekdayCapacity'->>extract(dow from day)::int)::int);
      if p_preferences->'unavailableDates' ? day::text then cap := 0; end if;
      if (select count(*) from public.study_plan_tasks where user_id = actor and scheduled_date = day) > greatest(cap, coalesce((original_counts->>day::text)::int,0)) then
        raise exception 'These blocks no longer fit your availability. Preview again.' using errcode = '40001';
      end if;
    end loop;
  end if;
  insert into public.planner_preferences(user_id,settings) values (actor,p_preferences)
    on conflict(user_id) do update set settings = excluded.settings;
  insert into public.planner_changes(user_id,kind,changes) values (actor,p_kind,actual_changes) returning id into change_id;
  if p_kind = 'undo' then update public.planner_changes set undone_at = now() where id = p_undo_id and user_id = actor; end if;
  return change_id;
end;
$$;
revoke all on function public.commit_planner_change(text,text,jsonb,jsonb,jsonb,jsonb,uuid) from public, anon;
grant execute on function public.commit_planner_change(text,text,jsonb,jsonb,jsonb,jsonb,uuid) to authenticated;
notify pgrst, 'reload schema';
