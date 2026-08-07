alter table public.study_sessions
  add column if not exists messages jsonb not null default '[]'::jsonb;

alter table public.study_sessions
  drop constraint if exists study_sessions_messages_is_array;

alter table public.study_sessions
  add constraint study_sessions_messages_is_array
    check (jsonb_typeof(messages) = 'array');

notify pgrst, 'reload schema';
