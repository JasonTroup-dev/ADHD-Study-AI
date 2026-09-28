create table public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paddle_customer_id text not null,
  paddle_subscription_id text not null unique,
  status text not null,
  price_id text,
  next_billed_at timestamptz,
  scheduled_change text,
  last_event_occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_subscriptions_status_check check (
    status in ('active', 'canceled', 'past_due', 'paused', 'trialing')
  ),
  constraint billing_subscriptions_scheduled_change_check check (
    scheduled_change is null
    or scheduled_change in ('cancel', 'pause', 'resume')
  )
);

create index billing_subscriptions_customer_id_idx
  on public.billing_subscriptions (paddle_customer_id);

alter table public.billing_subscriptions enable row level security;

create policy "Users can view their own billing subscription"
  on public.billing_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.billing_subscriptions to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.billing_subscriptions from anon, authenticated;
grant select, insert, update on public.billing_subscriptions to service_role;

create table public.paddle_webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now()
);

alter table public.paddle_webhook_events enable row level security;

revoke all on public.paddle_webhook_events from anon, authenticated;
grant select, insert on public.paddle_webhook_events to service_role;

create or replace function public.process_paddle_subscription_event(
  p_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_user_id uuid,
  p_subscription_id text,
  p_customer_id text,
  p_status text,
  p_price_id text,
  p_next_billed_at timestamptz,
  p_scheduled_change text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.paddle_webhook_events (
    event_id,
    event_type,
    occurred_at
  )
  values (
    p_event_id,
    p_event_type,
    p_occurred_at
  )
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  insert into public.billing_subscriptions (
    user_id,
    paddle_customer_id,
    paddle_subscription_id,
    status,
    price_id,
    next_billed_at,
    scheduled_change,
    last_event_occurred_at
  )
  values (
    p_user_id,
    p_customer_id,
    p_subscription_id,
    p_status,
    p_price_id,
    p_next_billed_at,
    p_scheduled_change,
    p_occurred_at
  )
  on conflict (user_id) do update
  set paddle_customer_id = excluded.paddle_customer_id,
      paddle_subscription_id = excluded.paddle_subscription_id,
      status = excluded.status,
      price_id = excluded.price_id,
      next_billed_at = excluded.next_billed_at,
      scheduled_change = excluded.scheduled_change,
      last_event_occurred_at = excluded.last_event_occurred_at,
      updated_at = now()
  where excluded.last_event_occurred_at
    >= billing_subscriptions.last_event_occurred_at;

  return true;
end;
$$;

revoke all on function public.process_paddle_subscription_event(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text
) from public, anon, authenticated;

grant execute on function public.process_paddle_subscription_event(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  text
) to service_role;
