drop policy if exists "Users can analyze their own assignment materials"
  on public.assignment_materials;
create policy "Users can analyze their own assignment materials"
  on public.assignment_materials
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.assignments
      where assignments.id = assignment_materials.assignment_id
        and assignments.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.assignments
      where assignments.id = assignment_materials.assignment_id
        and assignments.user_id = (select auth.uid())
    )
  );

revoke update
  on public.assignment_materials
  from authenticated;

grant update (extracted_text)
  on public.assignment_materials
  to authenticated;

notify pgrst, 'reload schema';
