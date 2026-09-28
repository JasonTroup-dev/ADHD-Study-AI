alter table public.assignments
  add column if not exists original_file_name text,
  add column if not exists file_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists storage_path text,
  add column if not exists extracted_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assignments'::regclass
      and conname = 'assignments_file_size_bytes_check'
  ) then
    alter table public.assignments
      add constraint assignments_file_size_bytes_check
      check (file_size_bytes is null or file_size_bytes >= 0);
  end if;
end
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'assignment-files',
  'assignment-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own assignment files"
  on storage.objects;
create policy "Users can view their own assignment files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'assignment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload their own assignment files"
  on storage.objects;
create policy "Users can upload their own assignment files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'assignment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own assignment files"
  on storage.objects;
create policy "Users can update their own assignment files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'assignment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'assignment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own assignment files"
  on storage.objects;
create policy "Users can delete their own assignment files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'assignment-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
