create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table private.ai_quota_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  quota_key text not null check (
    quota_key in ('chat', 'chat_files', 'flashcards', 'study_guides')
  ),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, quota_key, window_started_at)
);

alter table private.ai_quota_usage enable row level security;

revoke all on table private.ai_quota_usage from public, anon, authenticated;

create or replace function public.consume_ai_quota(requested_quota text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  quota_limit integer;
  current_count integer;
  request_allowed boolean;
  window_start timestamptz := date_trunc('hour', statement_timestamp());
  reset_at timestamptz := window_start + interval '1 hour';
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  quota_limit := case requested_quota
    when 'chat' then 30
    when 'chat_files' then 20
    when 'flashcards' then 10
    when 'study_guides' then 5
    else null
  end;

  if quota_limit is null then
    raise exception 'Unknown AI quota' using errcode = '22023';
  end if;

  delete from private.ai_quota_usage
  where user_id = current_user_id
    and window_started_at < window_start - interval '24 hours';

  insert into private.ai_quota_usage (
    user_id,
    quota_key,
    window_started_at,
    request_count
  )
  values (current_user_id, requested_quota, window_start, 1)
  on conflict (user_id, quota_key, window_started_at)
  do update
    set request_count = ai_quota_usage.request_count + 1
    where ai_quota_usage.request_count < quota_limit
  returning request_count into current_count;

  request_allowed := found;

  if current_count is null then
    current_count := quota_limit;
  end if;

  return jsonb_build_object(
    'allowed', request_allowed,
    'limit', quota_limit,
    'remaining', greatest(quota_limit - current_count, 0),
    'reset_at', reset_at
  );
end;
$$;

revoke all on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;

comment on function public.consume_ai_quota(text) is
  'Atomically consumes one hourly, per-user quota unit for a protected AI endpoint.';

notify pgrst, 'reload schema';
