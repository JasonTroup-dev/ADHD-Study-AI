import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const actor = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const assignmentId = '00000000-0000-4000-8000-000000000003';
const taskId = '00000000-0000-4000-8000-000000000004';
const preferences = {maxTasksPerDay:1,weekdayCapacity:[1,1,1,1,1,1,1],unavailableDates:[]};
let db: PGlite;
type TaskRow = Record<string, unknown>;
async function workspace() {
  const result = await db.query<{workspace: {version:string; tasks:TaskRow[]; assignments:TaskRow[]}}>('select public.planner_workspace() as workspace');
  return result.rows[0].workspace;
}
async function commit(version: string, changes: unknown[], kind = 'catch_up', undoId: string | null = null, assignments: unknown[] = [], newClass: unknown = null) {
  const result = await db.query<{id:string}>('select public.commit_planner_change($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::uuid) as id',
    [version,kind,JSON.stringify(changes),JSON.stringify(preferences),JSON.stringify(assignments),newClass === null ? null : JSON.stringify(newClass),undoId]);
  return result.rows[0].id;
}
async function seedTask(id = taskId, date = '2026-09-01') {
  await db.query('insert into public.study_plan_tasks(id,user_id,assignment_id,title,scheduled_date,source) values ($1,$2,$3,$4,$5,$6)',[id,actor,assignmentId,'Essay: Draft',date,'generic_generated']);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    create table public.classes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text,class_code text,prof_name text,color text);
    create table public.assignments(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),class_id uuid references public.classes(id),title text,description text,due_date date,importance text,points numeric,status text default 'not_started',context_version int default 0);
    create table public.study_plan_tasks(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),class_id uuid references public.classes(id),assignment_id uuid references public.assignments(id),title text not null,description text,scheduled_date date not null,priority text,status text not null default 'todo',source text not null default 'generic_generated',context_version int not null default 0,user_edited boolean not null default false,created_at timestamptz default now(),start_time time,end_time time,completed_at timestamptz);
    create table public.study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),assignment_id uuid references public.assignments(id),planner_task_id uuid references public.study_plan_tasks(id));
    grant select,insert,update,delete on public.classes,public.assignments,public.study_plan_tasks,public.study_sessions to authenticated;
    alter table public.classes enable row level security;
    alter table public.assignments enable row level security;
    alter table public.study_plan_tasks enable row level security;
    alter table public.study_sessions enable row level security;
    create policy own on public.classes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy own on public.assignments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy own on public.study_plan_tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy own on public.study_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20260908213451_adaptive_planning.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20260909234247_planner_course_sequence.sql',import.meta.url),'utf8'));
},30000);
beforeEach(async () => {
  await db.exec(`reset role; truncate public.planner_changes,public.planner_preferences,public.study_sessions,public.study_plan_tasks,public.assignments,public.classes,auth.users cascade;
    insert into auth.users values ('${actor}'),('${other}');
    insert into public.assignments(id,user_id,title,due_date) values ('${assignmentId}','${actor}','Essay','2026-09-20');
    set role authenticated; set request.jwt.claim.sub = '${actor}';`);
});
afterAll(async () => { await db?.close(); });
describe('planner database transactions', () => {
  it('persists daily minute limits in existing preference storage', async () => {
    const initial = await workspace();
    const settings = { ...preferences, dateMinutes: { '2026-09-09': 20, '2026-09-10': 0 } };
    await db.query('select public.commit_planner_change($1,$2,$3::jsonb,$4::jsonb)',
      [initial.version, 'catch_up', '[]', JSON.stringify(settings)]);
    const saved = await db.query<{ settings: typeof settings }>('select settings from public.planner_preferences where user_id=$1', [actor]);
    expect(saved.rows[0].settings).toEqual(settings);
  });
  it('includes exam coverage and kind in the versioned workspace', async () => {
    const before = await workspace();
    await db.query('update public.assignments set description=$1, deadline_evidence=$2::jsonb where id=$3',
      ['Covers Problem Sets 1 and 2.', JSON.stringify({kind:'exam'}), assignmentId]);
    const after = await workspace();
    expect(after.assignments[0].description).toBe('Covers Problem Sets 1 and 2.');
    expect(after.assignments[0].deadline_evidence).toEqual({kind:'exam'});
    expect(after.version).not.toBe(before.version);
  });
  it('applies and undoes a catch-up change atomically', async () => {
    await seedTask();
    const initial = await workspace(); const before = initial.tasks[0];
    const id = await commit(initial.version,[{before,after:{...before,scheduled_date:'2026-09-08'}}]);
    const moved = await workspace(); expect(moved.tasks[0].scheduled_date).toBe('2026-09-08');
    await commit(moved.version,[],'undo',id);
    expect((await workspace()).tasks[0]).toEqual(before);
  });
  it('rejects a stale preview without partial changes', async () => {
    await seedTask(); const initial = await workspace();
    await db.query('update public.study_plan_tasks set title=$1 where id=$2',['Edited title',taskId]);
    await expect(commit(initial.version,[{before:initial.tasks[0],after:{...initial.tasks[0],scheduled_date:'2026-09-08'}}])).rejects.toThrow('planner changed');
    expect((await workspace()).tasks[0].scheduled_date).toBe('2026-09-01');
  });
  it('rejects undo after work starts', async () => {
    await seedTask(); const initial = await workspace();
    const id = await commit(initial.version,[{before:initial.tasks[0],after:{...initial.tasks[0],scheduled_date:'2026-09-08'}}]);
    await db.query('insert into public.study_sessions(user_id,assignment_id,planner_task_id) values ($1,$2,$3)',[actor,assignmentId,taskId]);
    await expect(commit((await workspace()).version,[],'undo',id)).rejects.toThrow('protected');
    expect((await workspace()).tasks[0].scheduled_date).toBe('2026-09-08');
  });
  it('protects pinned work even if an API caller submits a forged change', async () => {
    await seedTask(); await db.query('update public.study_plan_tasks set pinned=true where id=$1',[taskId]);
    const initial = await workspace();
    await expect(commit(initial.version,[{before:initial.tasks[0],after:{...initial.tasks[0],pinned:false,scheduled_date:'2026-09-08'}}])).rejects.toThrow('protected');
  });
  it('rolls back the complete batch if it would exceed capacity', async () => {
    await seedTask(); await seedTask('00000000-0000-4000-8000-000000000005','2026-09-02');
    const initial = await workspace();
    await expect(commit(initial.version,initial.tasks.map(before => ({before,after:{...before,scheduled_date:'2026-09-08'}})))).rejects.toThrow('availability');
    expect((await workspace()).tasks).toEqual(initial.tasks);
  });
  it('supports split/merge proposals and restores the old tasks on undo', async () => {
    await seedTask(); const initial = await workspace(); const before = initial.tasks[0];
    const after = {...before,id:'00000000-0000-4000-8000-000000000005',title:'Essay: Compare sources',scheduled_date:'2026-09-08',checklist:['Three claims written.']};
    const id = await commit(initial.version,[{before,after:null},{before:null,after}],'restructure');
    expect((await workspace()).tasks[0].checklist).toEqual(['Three claims written.']);
    await commit((await workspace()).version,[],'undo',id);
    expect((await workspace()).tasks[0]).toEqual(before);
  });
  it('isolates snapshots and undo records by user', async () => {
    await seedTask(); const initial = await workspace();
    const id = await commit(initial.version,[{before:initial.tasks[0],after:{...initial.tasks[0],scheduled_date:'2026-09-08'}}]);
    await db.exec(`set request.jwt.claim.sub = '${other}'`);
    const stranger = await workspace(); expect(stranger.tasks).toHaveLength(0);
    await expect(commit(stranger.version,[],'undo',id)).rejects.toThrow('cannot be undone');
  });
  it('rolls back class and assignment creation when a task is invalid', async () => {
    const initial = await workspace();
    const classId = '00000000-0000-4000-8000-000000000006';
    await expect(commit(initial.version,[{before:null,after:{id:taskId,user_id:other,title:'Invalid'}}],'import',null,
      [{id:'00000000-0000-4000-8000-000000000007',class_id:classId,title:'New assignment',due_date:'2026-09-20',importance:'low'}],
      {id:classId,name:'New class',classCode:'BIO',professorName:'Teacher',color:'blue'})).rejects.toThrow();
    expect((await db.query('select * from public.classes')).rows).toHaveLength(0);
    expect((await db.query('select * from public.assignments')).rows).toHaveLength(1);
  });
});
