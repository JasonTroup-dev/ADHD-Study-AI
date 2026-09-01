create table public.practice_quiz_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  source_name text,
  is_shared boolean not null default false,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (share_token)
);

create table public.practice_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid not null references public.practice_quiz_sets(id) on delete cascade,
  question text not null check (char_length(trim(question)) > 0),
  choices jsonb not null check (
    jsonb_typeof(choices) = 'array'
    and jsonb_array_length(choices) = 4
  ),
  correct_choice_index smallint not null check (correct_choice_index between 0 and 3),
  explanation text not null,
  topic text not null,
  difficulty text not null check (
    difficulty in ('foundational', 'application', 'challenge')
  ),
  question_order integer not null check (question_order >= 0),
  created_at timestamptz not null default now(),
  unique (quiz_set_id, question_order)
);

create index practice_quiz_sets_user_created_idx
  on public.practice_quiz_sets (user_id, created_at desc);
create index practice_quiz_sets_class_created_idx
  on public.practice_quiz_sets (class_id, created_at desc)
  where class_id is not null;
create index practice_quiz_questions_set_order_idx
  on public.practice_quiz_questions (quiz_set_id, question_order);

alter table public.practice_quiz_sets enable row level security;
alter table public.practice_quiz_questions enable row level security;

create policy "Users can view their own practice quizzes"
  on public.practice_quiz_sets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own practice quizzes"
  on public.practice_quiz_sets
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1
        from public.classes
        where classes.id = practice_quiz_sets.class_id
          and classes.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can update their own practice quizzes"
  on public.practice_quiz_sets
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      class_id is null
      or exists (
        select 1
        from public.classes
        where classes.id = practice_quiz_sets.class_id
          and classes.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can delete their own practice quizzes"
  on public.practice_quiz_sets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view questions in their own practice quizzes"
  on public.practice_quiz_questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.practice_quiz_sets
      where practice_quiz_sets.id = quiz_set_id
        and practice_quiz_sets.user_id = (select auth.uid())
    )
  );

create policy "Users can add questions to their own practice quizzes"
  on public.practice_quiz_questions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.practice_quiz_sets
      where practice_quiz_sets.id = quiz_set_id
        and practice_quiz_sets.user_id = (select auth.uid())
    )
  );

create policy "Users can update questions in their own practice quizzes"
  on public.practice_quiz_questions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.practice_quiz_sets
      where practice_quiz_sets.id = quiz_set_id
        and practice_quiz_sets.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.practice_quiz_sets
      where practice_quiz_sets.id = quiz_set_id
        and practice_quiz_sets.user_id = (select auth.uid())
    )
  );

create policy "Users can delete questions in their own practice quizzes"
  on public.practice_quiz_questions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.practice_quiz_sets
      where practice_quiz_sets.id = quiz_set_id
        and practice_quiz_sets.user_id = (select auth.uid())
    )
  );

revoke all on table public.practice_quiz_sets from anon;
revoke all on table public.practice_quiz_questions from anon;
grant select, insert, update, delete on table public.practice_quiz_sets to authenticated;
grant select, insert, update, delete on table public.practice_quiz_questions to authenticated;
grant all on table public.practice_quiz_sets to service_role;
grant all on table public.practice_quiz_questions to service_role;
