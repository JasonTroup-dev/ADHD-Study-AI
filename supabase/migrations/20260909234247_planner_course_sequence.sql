create or replace function public.planner_workspace() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with workspace as (
    select jsonb_build_object(
      'tasks', coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.study_plan_tasks t where t.user_id = auth.uid()), '[]'::jsonb),
      'assignments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due_date', a.due_date, 'status', a.status, 'context_version', a.context_version, 'class_id', a.class_id, 'importance', a.importance, 'description', a.description, 'deadline_evidence', a.deadline_evidence) order by a.id) from public.assignments a where a.user_id = auth.uid()), '[]'::jsonb),
      'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'assignment_id', s.assignment_id, 'planner_task_id', s.planner_task_id) order by s.id) from public.study_sessions s where s.user_id = auth.uid()), '[]'::jsonb),
      'preferences', coalesce((select p.settings from public.planner_preferences p where p.user_id = auth.uid()), '{"maxTasksPerDay":3,"weekdayCapacity":[3,3,3,3,3,3,3],"unavailableDates":[]}'::jsonb),
      'lastChangeId', (select c.id from public.planner_changes c where c.user_id = auth.uid() and c.kind in ('catch_up', 'restructure') and c.undone_at is null order by c.created_at desc limit 1)
    ) as body
  ) select body || jsonb_build_object('version', md5(body::text)) from workspace;
$$;
revoke all on function public.planner_workspace() from public, anon;
grant execute on function public.planner_workspace() to authenticated;
