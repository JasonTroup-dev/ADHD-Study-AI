do $$
begin
  if to_regclass('public.study_sessions') is null then
    create table public.study_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      class_id uuid references public.classes(id) on delete set null,
      assignment_id uuid references public.assignments(id) on delete set null,
      title text,
      planned_minutes integer,
      actual_minutes integer,
      status text not null default 'active',
      session_type text not null default 'general_study',
      started_at timestamptz,
      ended_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end
$$;

alter table public.study_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists class_id uuid references public.classes(id) on delete set null,
  add column if not exists assignment_id uuid references public.assignments(id) on delete set null,
  add column if not exists title text,
  add column if not exists planned_minutes integer,
  add column if not exists actual_minutes integer,
  add column if not exists status text not null default 'active',
  add column if not exists session_type text not null default 'general_study',
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.study_sessions
set status = 'active'
where status is null
  or status not in ('active', 'completed', 'cancelled');

update public.study_sessions
set session_type = 'general_study'
where session_type is null
  or session_type not in (
    'assignment',
    'flashcards',
    'practice_quiz',
    'general_study'
  );

alter table public.study_sessions
  alter column user_id set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column class_id drop not null,
  alter column session_type set default 'general_study',
  alter column session_type set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.study_sessions
  drop constraint if exists study_sessions_status_check,
  drop constraint if exists study_sessions_session_type_check;

alter table public.study_sessions
  add constraint study_sessions_status_check
    check (status in ('active', 'completed', 'cancelled')),
  add constraint study_sessions_session_type_check
    check (
      session_type in (
        'assignment',
        'flashcards',
        'practice_quiz',
        'general_study'
      )
    );

create index if not exists study_sessions_user_status_started_idx
  on public.study_sessions (user_id, status, started_at desc);

create index if not exists study_sessions_user_ended_idx
  on public.study_sessions (user_id, ended_at desc);

create or replace function public.set_study_sessions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_study_sessions_updated_at
  on public.study_sessions;

create trigger set_study_sessions_updated_at
before update on public.study_sessions
for each row
execute function public.set_study_sessions_updated_at();

alter table public.study_sessions enable row level security;

drop policy if exists "Users can view their own study sessions"
  on public.study_sessions;
create policy "Users can view their own study sessions"
  on public.study_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own study sessions"
  on public.study_sessions;
create policy "Users can create their own study sessions"
  on public.study_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own study sessions"
  on public.study_sessions;
create policy "Users can update their own study sessions"
  on public.study_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own study sessions"
  on public.study_sessions;
create policy "Users can delete their own study sessions"
  on public.study_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.study_sessions
  to authenticated;

notify pgrst, 'reload schema';
