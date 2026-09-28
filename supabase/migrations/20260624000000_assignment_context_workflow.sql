alter table public.assignments
  add column if not exists context_status text not null default 'missing',
  add column if not exists context_version integer not null default 0;

update public.assignments
set context_status = case
  when nullif(trim(extracted_text), '') is not null then 'ready'
  when storage_path is not null then 'failed'
  else 'missing'
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assignments'::regclass
      and conname = 'assignments_context_status_check'
  ) then
    alter table public.assignments
      add constraint assignments_context_status_check
      check (context_status in ('missing', 'processing', 'ready', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assignments'::regclass
      and conname = 'assignments_context_version_check'
  ) then
    alter table public.assignments
      add constraint assignments_context_version_check
      check (context_version >= 0);
  end if;
end
$$;

create table if not exists public.assignment_materials (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_file_name text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  storage_path text not null unique,
  extracted_text text,
  created_at timestamptz not null default now(),
  constraint assignment_materials_file_size_check check (file_size_bytes >= 0)
);

create index if not exists assignment_materials_assignment_id_idx
  on public.assignment_materials (assignment_id, created_at);

create index if not exists assignment_materials_user_id_idx
  on public.assignment_materials (user_id);

alter table public.assignment_materials enable row level security;

drop policy if exists "Users can view their own assignment materials"
  on public.assignment_materials;
create policy "Users can view their own assignment materials"
  on public.assignment_materials
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own assignment materials"
  on public.assignment_materials;
create policy "Users can add their own assignment materials"
  on public.assignment_materials
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.assignments
      where assignments.id = assignment_materials.assignment_id
        and assignments.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own assignment materials"
  on public.assignment_materials;
create policy "Users can delete their own assignment materials"
  on public.assignment_materials
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete
  on public.assignment_materials
  to authenticated;

alter table public.study_plan_tasks
  add column if not exists source text not null default 'manual',
  add column if not exists context_version integer not null default 0,
  add column if not exists user_edited boolean not null default false;

update public.study_plan_tasks
set source = 'generic_generated'
where assignment_id is not null
  and source = 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.study_plan_tasks'::regclass
      and conname = 'study_plan_tasks_source_check'
  ) then
    alter table public.study_plan_tasks
      add constraint study_plan_tasks_source_check
      check (source in ('manual', 'generic_generated', 'context_generated'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.study_plan_tasks'::regclass
      and conname = 'study_plan_tasks_context_version_check'
  ) then
    alter table public.study_plan_tasks
      add constraint study_plan_tasks_context_version_check
      check (context_version >= 0);
  end if;
end
$$;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json'
]
where id = 'assignment-files';

notify pgrst, 'reload schema';
