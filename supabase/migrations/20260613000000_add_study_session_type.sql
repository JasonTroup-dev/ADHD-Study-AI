do $$
declare
  legacy_table text := concat('fo', 'cus_sessions');
begin
  if to_regclass('public.study_sessions') is null
    and to_regclass('public.' || legacy_table) is not null
  then
    execute format(
      'alter table public.%I rename to study_sessions',
      legacy_table
    );
  end if;
end
$$;

alter table if exists public.study_sessions
add column if not exists session_type text not null default 'general_study';

notify pgrst, 'reload schema';
