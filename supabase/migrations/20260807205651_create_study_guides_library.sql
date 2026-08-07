create table if not exists public.study_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  source_file_id uuid references public.assignment_files(id) on delete set null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_guides
  add column if not exists original_file_name text;

update public.study_guides
set original_file_name = 'Study material'
where original_file_name is null or length(btrim(original_file_name)) = 0;

alter table public.study_guides
  alter column original_file_name set not null;

create index if not exists study_guides_user_created_at_idx
  on public.study_guides (user_id, created_at desc);

alter table public.study_guides enable row level security;

drop policy if exists "Users can view their study guides" on public.study_guides;
drop policy if exists "Users can insert their study guides" on public.study_guides;
drop policy if exists "Users can update their study guides" on public.study_guides;
drop policy if exists "Users can delete their study guides" on public.study_guides;

drop policy if exists "Users can view their own study guides" on public.study_guides;
create policy "Users can view their own study guides"
  on public.study_guides for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own study guides" on public.study_guides;
create policy "Users can create their own study guides"
  on public.study_guides for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own study guides" on public.study_guides;
create policy "Users can update their own study guides"
  on public.study_guides for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own study guides" on public.study_guides;
create policy "Users can delete their own study guides"
  on public.study_guides for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.study_guides
  to authenticated;

revoke all on table public.study_guides from anon;
