begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(16);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.classes'::regclass),
  'classes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.assignments'::regclass),
  'assignments has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.study_plan_tasks'::regclass),
  'study_plan_tasks has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.study_sessions'::regclass),
  'study_sessions has RLS enabled'
);

insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'rls-user-1@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'rls-user-2@example.test');

insert into public.classes (id, user_id, name)
values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'User 1 Biology'),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'User 2 History');

insert into public.assignments (id, user_id, class_id, title)
values
  ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'User 1 Lab'),
  ('b2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'User 2 Essay');

insert into public.study_plan_tasks (
  id, user_id, class_id, assignment_id, title, scheduled_date
)
values
  ('c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'User 1 Study', current_date),
  ('c2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'User 2 Study', current_date);

insert into public.study_sessions (
  id, user_id, class_id, assignment_id, title, status
)
values
  ('d1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'User 1 Session', 'active'),
  ('d2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'User 2 Session', 'active');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.classes',
  array[1::bigint],
  'user 1 sees only their class'
);
select results_eq(
  'select count(*) from public.assignments',
  array[1::bigint],
  'user 1 sees only their assignment'
);
select results_eq(
  'select count(*) from public.study_plan_tasks',
  array[1::bigint],
  'user 1 sees only their planner task'
);
select results_eq(
  'select count(*) from public.study_sessions',
  array[1::bigint],
  'user 1 sees only their study session'
);
select lives_ok(
  $$insert into public.classes (user_id, name) values ('11111111-1111-4111-8111-111111111111', 'Owned class')$$,
  'user 1 can insert an owned class'
);
select throws_ok(
  $$insert into public.classes (user_id, name) values ('22222222-2222-4222-8222-222222222222', 'Spoofed class')$$,
  '42501',
  null,
  'user 1 cannot insert a class for user 2'
);
select throws_ok(
  $$insert into public.assignments (user_id, class_id, title) values ('11111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 'Cross-user assignment')$$,
  '42501',
  null,
  'user 1 cannot attach an assignment to user 2 class'
);
select throws_ok(
  $$insert into public.study_plan_tasks (user_id, class_id, assignment_id, title, scheduled_date) values ('11111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Cross-user task', current_date)$$,
  '42501',
  null,
  'user 1 cannot attach a task to user 2 records'
);
select throws_ok(
  $$insert into public.study_sessions (user_id, class_id, assignment_id, title) values ('11111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 'b2222222-2222-4222-8222-222222222222', 'Cross-user session')$$,
  '42501',
  null,
  'user 1 cannot attach a session to user 2 records'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  'select count(*) from public.classes',
  array[1::bigint],
  'user 2 sees only their class'
);
select results_eq(
  'select count(*) from public.study_plan_tasks',
  array[1::bigint],
  'user 2 sees only their planner task'
);
select results_eq(
  $$with changed as (
      update public.study_sessions
      set title = 'Changed by user 2'
      where id = 'd1111111-1111-4111-8111-111111111111'
      returning 1
    ) select count(*) from changed$$,
  array[0::bigint],
  'user 2 cannot update user 1 study session'
);

select * from finish();
rollback;
