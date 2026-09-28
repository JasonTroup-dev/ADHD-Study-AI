create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  class_code text,
  prof_name text,
  num_sessions integer,
  color text,
  constraint classes_color_check check (
    color is null
    or color in ('blue', 'purple', 'green', 'red', 'orange', 'yellow', 'pink', 'gray')
  )
);

create index if not exists classes_user_id_idx
  on public.classes (user_id);

alter table public.classes enable row level security;

create policy "Users can view their own classes"
  on public.classes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own classes"
  on public.classes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own classes"
  on public.classes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own classes"
  on public.classes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.classes to authenticated;

create table if not exists public.study_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  description text,
  scheduled_date date not null,
  start_time time,
  end_time time,
  estimated_minutes integer,
  priority text,
  status text not null default 'todo',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint study_plan_tasks_priority_check check (
    priority is null or priority in ('low', 'medium', 'high')
  ),
  constraint study_plan_tasks_status_check check (
    status in ('todo', 'completed')
  )
);

create index if not exists study_plan_tasks_user_date_idx
  on public.study_plan_tasks (user_id, scheduled_date);

alter table public.study_plan_tasks enable row level security;

create policy "Users can view their own planner tasks"
  on public.study_plan_tasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own planner tasks"
  on public.study_plan_tasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own planner tasks"
  on public.study_plan_tasks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own planner tasks"
  on public.study_plan_tasks for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.study_plan_tasks to authenticated;

-- The historical session migrations predate the final table contract and expect
-- this relation to exist. Later migrations add every application column and RLS.
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid()
);
