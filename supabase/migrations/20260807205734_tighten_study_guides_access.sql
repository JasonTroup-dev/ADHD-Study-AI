create index if not exists study_guides_class_id_idx
  on public.study_guides (class_id);

create index if not exists study_guides_assignment_id_idx
  on public.study_guides (assignment_id);

create index if not exists study_guides_source_file_id_idx
  on public.study_guides (source_file_id);

revoke all on table public.study_guides from anon;
revoke all on table public.study_guides from authenticated;
grant select, insert, update, delete on table public.study_guides
  to authenticated;
