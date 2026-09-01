begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(8);

select has_table('public', 'practice_quiz_sets', 'practice quiz sets table exists');
select has_table('public', 'practice_quiz_questions', 'practice quiz questions table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.practice_quiz_sets'::regclass),
  'practice quiz sets use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.practice_quiz_questions'::regclass),
  'practice quiz questions use RLS'
);

insert into auth.users (id, aud, role, email)
values
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'quiz-owner@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'quiz-other@example.test');

insert into public.classes (id, user_id, name)
values ('77777777-7777-4777-8777-777777777777', '55555555-5555-4555-8555-555555555555', 'Biology');

set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';

select lives_ok(
  $$insert into public.practice_quiz_sets (id, user_id, class_id, title)
    values (
      '88888888-8888-4888-8888-888888888888',
      '55555555-5555-4555-8555-555555555555',
      '77777777-7777-4777-8777-777777777777',
      'Cell Transport'
    )$$,
  'owners can save a quiz linked to their class'
);

select lives_ok(
  $$insert into public.practice_quiz_questions (
      quiz_set_id, question, choices, correct_choice_index,
      explanation, topic, difficulty, question_order
    ) values (
      '88888888-8888-4888-8888-888888888888',
      'What crosses the membrane?',
      '["Water", "DNA", "Ribosome", "Nucleus"]'::jsonb,
      0,
      'Water can cross through osmosis.',
      'Osmosis',
      'foundational',
      0
    )$$,
  'owners can save questions in their quiz'
);

select is(
  (select count(*)::integer from public.practice_quiz_sets),
  1,
  'owners can read their quiz'
);

set local request.jwt.claim.sub = '66666666-6666-4666-8666-666666666666';

select is(
  (select count(*)::integer from public.practice_quiz_sets),
  0,
  'other users cannot read the quiz'
);

select * from finish();
rollback;
