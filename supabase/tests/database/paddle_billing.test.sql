begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(6);

insert into auth.users (id, aud, role, email)
values
  ('31111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'billing-user-1@example.test'),
  ('32222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'billing-user-2@example.test');

set local role service_role;

select is(
  public.process_paddle_subscription_event(
    'evt_billing_1',
    'subscription.created',
    '2026-08-29T01:00:00Z',
    '31111111-1111-4111-8111-111111111111',
    'sub_billing_1',
    'ctm_billing_1',
    'active',
    'pri_billing_1',
    '2026-09-29T01:00:00Z',
    null
  ),
  true,
  'service role can process a Paddle subscription event'
);

select is(
  public.process_paddle_subscription_event(
    'evt_billing_1',
    'subscription.created',
    '2026-08-29T01:00:00Z',
    '31111111-1111-4111-8111-111111111111',
    'sub_billing_1',
    'ctm_billing_1',
    'active',
    'pri_billing_1',
    '2026-09-29T01:00:00Z',
    null
  ),
  false,
  'duplicate Paddle events are ignored'
);

set local role authenticated;
set local request.jwt.claim.sub = '31111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.billing_subscriptions',
  array[1::bigint],
  'a user can read their own subscription'
);

select throws_ok(
  $$insert into public.billing_subscriptions (
      user_id,
      paddle_customer_id,
      paddle_subscription_id,
      status,
      last_event_occurred_at
    ) values (
      '31111111-1111-4111-8111-111111111111',
      'ctm_spoofed',
      'sub_spoofed',
      'active',
      now()
    )$$,
  '42501',
  null,
  'authenticated users cannot write subscription state'
);

select throws_ok(
  $$select public.process_paddle_subscription_event(
      'evt_spoofed',
      'subscription.created',
      now(),
      '31111111-1111-4111-8111-111111111111',
      'sub_spoofed',
      'ctm_spoofed',
      'active',
      'pri_spoofed',
      null,
      null
    )$$,
  '42501',
  null,
  'authenticated users cannot call the webhook processor'
);

set local request.jwt.claim.sub = '32222222-2222-4222-8222-222222222222';

select results_eq(
  'select count(*) from public.billing_subscriptions',
  array[0::bigint],
  'another user cannot read the subscription'
);

select * from finish();
rollback;
