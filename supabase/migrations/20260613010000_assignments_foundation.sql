create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  importance text not null default 'medium',
  points numeric(10, 2),
  status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments
  add column if not exists importance text,
  add column if not exists points numeric(10, 2);

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.assignments'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%status%'
        or pg_get_constraintdef(oid) ilike '%importance%'
        or pg_get_constraintdef(oid) ilike '%points%'
      )
  loop
    execute format(
      'alter table public.assignments drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

alter table public.assignments
  alter column status drop default,
  alter column status type text using status::text;

update public.assignments
set importance = 'medium'
where importance is null
  or importance not in ('low', 'medium', 'high', 'critical');

update public.assignments
set status = 'not_started'
where status is null
  or status not in ('not_started', 'in_progress', 'completed');

update public.assignments
set points = null
where points < 0;

alter table public.assignments
  alter column importance set default 'medium',
  alter column importance set not null,
  alter column status set default 'not_started',
  alter column status set not null;

alter table public.assignments
  add constraint assignments_importance_check
    check (importance in ('low', 'medium', 'high', 'critical')),
  add constraint assignments_status_check
    check (status in ('not_started', 'in_progress', 'completed')),
  add constraint assignments_points_check
    check (points is null or points >= 0);

create index if not exists assignments_user_due_date_idx
  on public.assignments (user_id, due_date);

create index if not exists assignments_class_id_idx
  on public.assignments (class_id);

alter table public.study_plan_tasks
  add column if not exists assignment_id uuid
  references public.assignments(id) on delete cascade;

create index if not exists study_plan_tasks_assignment_id_idx
  on public.study_plan_tasks (assignment_id);

create or replace function public.set_assignments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_assignments_updated_at on public.assignments;

create trigger set_assignments_updated_at
before update on public.assignments
for each row
execute function public.set_assignments_updated_at();

alter table public.assignments enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assignments'
  loop
    execute format(
      'drop policy %I on public.assignments',
      policy_name
    );
  end loop;
end
$$;

create policy "Users can view their own assignments"
  on public.assignments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own assignments"
  on public.assignments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1
        from public.classes
        where classes.id = assignments.class_id
          and classes.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can update their own assignments"
  on public.assignments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1
        from public.classes
        where classes.id = assignments.class_id
          and classes.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can delete their own assignments"
  on public.assignments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.assignments
  to authenticated;

notify pgrst, 'reload schema';
