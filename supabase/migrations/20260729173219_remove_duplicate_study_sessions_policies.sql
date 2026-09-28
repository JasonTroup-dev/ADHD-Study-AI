-- These legacy policies are exact duplicates of the retained "their own"
-- policies for the same authenticated role and command.
drop policy if exists "Users can view their study sessions"
  on public.study_sessions;

drop policy if exists "Users can insert their study sessions"
  on public.study_sessions;

drop policy if exists "Users can update their study sessions"
  on public.study_sessions;

drop policy if exists "Users can delete their study sessions"
  on public.study_sessions;
