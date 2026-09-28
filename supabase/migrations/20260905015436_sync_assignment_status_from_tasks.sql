create or replace function public.sync_assignment_status_from_tasks()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_assignment_id uuid;
  assignment_ids uuid[];
  total_tasks integer;
  completed_tasks integer;
  next_status text;
begin
  if tg_op = 'DELETE' then
    assignment_ids := array[old.assignment_id];
  elsif tg_op = 'UPDATE'
    and old.assignment_id is distinct from new.assignment_id
  then
    assignment_ids := array[new.assignment_id, old.assignment_id];
  else
    assignment_ids := array[new.assignment_id];
  end if;

  foreach target_assignment_id in array assignment_ids
  loop
    if target_assignment_id is null then
      continue;
    end if;

    select
      count(*)::integer,
      count(*) filter (where status = 'completed')::integer
    into total_tasks, completed_tasks
    from public.study_plan_tasks
    where assignment_id = target_assignment_id;

    next_status := case
      when total_tasks = 0 then 'not_started'
      when completed_tasks = total_tasks then 'completed'
      when completed_tasks > 0 then 'in_progress'
      else 'not_started'
    end;

    update public.assignments
    set status = next_status
    where id = target_assignment_id
      and status is distinct from next_status;
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_assignment_status_from_tasks
  on public.study_plan_tasks;

create trigger sync_assignment_status_from_tasks
after insert or delete or update of assignment_id, status
on public.study_plan_tasks
for each row
execute function public.sync_assignment_status_from_tasks();

revoke execute on function public.sync_assignment_status_from_tasks()
from public, anon, authenticated;

with assignment_task_progress as (
  select
    assignment_id,
    count(*)::integer as total_tasks,
    count(*) filter (where status = 'completed')::integer as completed_tasks
  from public.study_plan_tasks
  where assignment_id is not null
  group by assignment_id
), corrected_statuses as (
  select
    assignment_id,
    case
      when completed_tasks = total_tasks then 'completed'
      when completed_tasks > 0 then 'in_progress'
      else 'not_started'
    end as status
  from assignment_task_progress
)
update public.assignments as assignment
set status = corrected.status
from corrected_statuses as corrected
where assignment.id = corrected.assignment_id
  and assignment.status is distinct from corrected.status;
