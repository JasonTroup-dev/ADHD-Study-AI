begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(8);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.ai_quota_usage'::regclass),
  'AI quota storage has RLS enabled'
);

select has_function(
  'public',
  'consume_ai_quota',
  array['text'],
  'AI quota function exists'
);

insert into auth.users (id, aud, role, email)
values
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'quota-user-1@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'quota-user-2@example.test');

set local role anon;

select throws_ok(
  $$select public.consume_ai_quota('study_guides')$$,
  '42501',
  null,
  'anonymous callers cannot consume AI quota'
);

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select is(
  (public.consume_ai_quota('study_guides')->>'allowed')::boolean,
  true,
  'the first request is allowed'
);

do $$
begin
  perform public.consume_ai_quota('study_guides')
  from generate_series(1, 4);
end;
$$;

select is(
  (public.consume_ai_quota('study_guides')->>'allowed')::boolean,
  false,
  'the request after the hourly limit is rejected'
);

select is(
  (public.consume_ai_quota('study_guides')->>'remaining')::integer,
  0,
  'a rejected quota response reports no remaining requests'
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select is(
  (public.consume_ai_quota('study_guides')->>'allowed')::boolean,
  true,
  'quotas are isolated per user'
);

select throws_ok(
  $$select public.consume_ai_quota('not-a-quota')$$,
  '22023',
  null,
  'unknown quota keys are rejected'
);

select * from finish();
rollback;
