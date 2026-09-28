do $$
declare
  legacy_table text := concat('fo', 'cus_sessions');
  legacy_constraint text := concat('fo', 'cus_sessions_session_type_check');
begin
  if to_regclass('public.study_sessions') is null
    and to_regclass('public.' || legacy_table) is not null
  then
    execute format(
      'alter table public.%I rename to study_sessions',
      legacy_table
    );
  end if;

  if to_regclass('public.study_sessions') is not null then
    execute format(
      'alter table public.study_sessions drop constraint if exists %I',
      legacy_constraint
    );

    alter table public.study_sessions
      add column if not exists session_type text not null default 'general_study';

    update public.study_sessions
    set session_type = 'general_study'
    where session_type not in (
      'assignment',
      'flashcards',
      'practice_quiz',
      'general_study'
    );

    alter table public.study_sessions
      drop constraint if exists study_sessions_session_type_check;

    alter table public.study_sessions
      add constraint study_sessions_session_type_check
      check (
        session_type in (
          'assignment',
          'flashcards',
          'practice_quiz',
          'general_study'
        )
      );
  end if;
end
$$;

notify pgrst, 'reload schema';
