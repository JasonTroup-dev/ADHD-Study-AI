create table if not exists public.assignment_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  extracted_text text,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_files_file_size_check check (file_size is null or file_size >= 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assignment_files'::regclass
      and conname = 'assignment_files_file_size_check'
  ) then
    alter table public.assignment_files
      add constraint assignment_files_file_size_check
      check (file_size is null or file_size >= 0);
  end if;
end
$$;

create index if not exists assignment_files_class_id_idx
  on public.assignment_files (class_id, created_at desc);

create index if not exists assignment_files_assignment_id_idx
  on public.assignment_files (assignment_id)
  where assignment_id is not null;

alter table public.assignment_files enable row level security;

drop policy if exists "Users can view their own class files"
  on public.assignment_files;
create policy "Users can view their own class files"
  on public.assignment_files
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own class files"
  on public.assignment_files;
create policy "Users can add their own class files"
  on public.assignment_files
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.classes
      where classes.id = assignment_files.class_id
        and classes.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own class files"
  on public.assignment_files;
create policy "Users can delete their own class files"
  on public.assignment_files
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete
  on public.assignment_files
  to authenticated;

notify pgrst, 'reload schema';
