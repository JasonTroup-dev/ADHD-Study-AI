import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth;
    create table auth.users(id uuid primary key);
    create role authenticated;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to authenticated;`);
  for (const name of ["20260612000000_core_schema_baseline.sql", "20260613010000_assignments_foundation.sql", "20260625000000_rename_sessions_to_study_sessions.sql", "20260626000000_study_sessions_schema_contract.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
  }
  await db.exec(`insert into auth.users values ('00000000-0000-4000-8000-000000000001');
    insert into study_sessions(user_id,title,status,actual_minutes) values
    ('00000000-0000-4000-8000-000000000001','Legacy session','completed',2632);`);
  await db.exec(await readFile(new URL("../supabase/migrations/20260911004746_study_time_confirmation.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });

it("preserves old timer readings as unverified", async () => {
  expect((await db.query("select actual_minutes,time_confirmed_at from study_sessions")).rows).toEqual([{ actual_minutes: 2632, time_confirmed_at: null }]);
});
it("enforces valid confirmed minutes and retains ownership RLS", async () => {
  await expect(db.exec("update study_sessions set time_confirmed_at=now()")).rejects.toThrow();
  await db.exec("update study_sessions set actual_minutes=25,time_confirmed_at=now()");
  await db.exec("set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'");
  expect((await db.query("update study_sessions set actual_minutes=99 returning id")).rows).toHaveLength(0);
  await db.exec("set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'");
  expect((await db.query("select actual_minutes from study_sessions")).rows).toEqual([{ actual_minutes: 25 }]);
  await db.exec("update study_sessions set actual_minutes=null,time_confirmed_at=null");
});
