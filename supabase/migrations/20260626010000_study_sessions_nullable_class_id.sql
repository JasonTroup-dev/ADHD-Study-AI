alter table public.study_sessions
  alter column class_id drop not null;

notify pgrst, 'reload schema';
