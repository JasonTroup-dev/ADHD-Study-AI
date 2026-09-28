begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(6);

select has_function(
  'public',
  'sync_assignment_status_from_tasks',
  array[]::text[],
  'assignment status sync function exists'
);

select has_trigger(
  'public',
  'study_plan_tasks',
  'sync_assignment_status_from_tasks',
  'assignment status sync trigger exists'
);

insert into auth.users (id, aud, role, email)
values (
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'assignment-sync@example.test'
);

set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';

insert into public.assignments (id, user_id, title, status)
values (
  'a5555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555',
  'Three-part problem set',
  'completed'
);

insert into public.study_plan_tasks (
  id,
  user_id,
  assignment_id,
  title,
  scheduled_date
)
values
  (
    'b5555555-5555-4555-8555-555555555551',
    '55555555-5555-4555-8555-555555555555',
    'a5555555-5555-4555-8555-555555555555',
    'Problem one',
    current_date
  ),
  (
    'b5555555-5555-4555-8555-555555555552',
    '55555555-5555-4555-8555-555555555555',
    'a5555555-5555-4555-8555-555555555555',
    'Problem two',
    current_date
  ),
  (
    'b5555555-5555-4555-8555-555555555553',
    '55555555-5555-4555-8555-555555555555',
    'a5555555-5555-4555-8555-555555555555',
    'Problem three',
    current_date
  );

select is(
  (select status from public.assignments where id = 'a5555555-5555-4555-8555-555555555555'),
  'not_started',
  'an assignment with no completed tasks is not started'
);

update public.study_plan_tasks
set status = 'completed'
where id = 'b5555555-5555-4555-8555-555555555551';

select is(
  (select status from public.assignments where id = 'a5555555-5555-4555-8555-555555555555'),
  'in_progress',
  'one completed task keeps a three-task assignment in progress'
);

update public.study_plan_tasks
set status = 'completed'
where assignment_id = 'a5555555-5555-4555-8555-555555555555';

select is(
  (select status from public.assignments where id = 'a5555555-5555-4555-8555-555555555555'),
  'completed',
  'an assignment becomes completed when every task is completed'
);

update public.study_plan_tasks
set status = 'todo'
where id = 'b5555555-5555-4555-8555-555555555551';

select is(
  (select status from public.assignments where id = 'a5555555-5555-4555-8555-555555555555'),
  'in_progress',
  'reopening one task reopens the assignment'
);

select * from finish();
rollback;
