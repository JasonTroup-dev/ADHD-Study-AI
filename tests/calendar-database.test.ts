import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const legacyTask = "00000000-0000-4000-8000-000000000003";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${owner}'), ('${other}');
  `);
  for (const file of [
    "20260612000000_core_schema_baseline.sql",
    "20260623000000_remove_study_plan_time_estimates.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  }
  await db.query(
    "insert into public.study_plan_tasks(id,user_id,title,scheduled_date) values ($1,$2,'Existing task','2026-10-13')",
    [legacyTask, owner],
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20260909201644_calendar_task_estimates.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    `set role authenticated; set request.jwt.claim.sub = '${owner}';`,
  );
}, 30000);

afterAll(async () => {
  await db?.close();
});

describe("calendar estimate migration on the historical database schema", () => {
  it("preserves existing tasks with unknown estimates", async () => {
    const result = await db.query(
      "select title, estimated_minutes from public.study_plan_tasks where id=$1",
      [legacyTask],
    );
    expect(result.rows).toEqual([
      { title: "Existing task", estimated_minutes: null },
    ]);
  });
  it("persists an optional estimate through the existing authenticated policies", async () => {
    const result = await db.query(
      "insert into public.study_plan_tasks(user_id,title,scheduled_date,estimated_minutes) values ($1,'Review','2026-10-14',25) returning estimated_minutes",
      [owner],
    );
    expect(result.rows).toEqual([{ estimated_minutes: 25 }]);
  });
  it.each([0, -10, 1441])(
    "rejects invalid estimates at the database boundary: %s",
    async (minutes) => {
      await expect(
        db.query(
          "update public.study_plan_tasks set estimated_minutes=$1 where id=$2",
          [minutes, legacyTask],
        ),
      ).rejects.toThrow(/estimated_minutes_check/);
    },
  );
  it("keeps estimates and task updates private to their owner", async () => {
    await db.exec(`set request.jwt.claim.sub = '${other}';`);
    try {
      expect(
        (
          await db.query("select * from public.study_plan_tasks where id=$1", [
            legacyTask,
          ])
        ).rows,
      ).toEqual([]);
      expect(
        (
          await db.query(
            "update public.study_plan_tasks set estimated_minutes=60 where id=$1 returning id",
            [legacyTask],
          )
        ).rows,
      ).toEqual([]);
      await expect(
        db.query(
          "insert into public.study_plan_tasks(user_id,title,scheduled_date,estimated_minutes) values ($1,'Other owner','2026-10-14',30)",
          [owner],
        ),
      ).rejects.toThrow(/row-level security/);
    } finally {
      await db.exec(`set request.jwt.claim.sub = '${owner}';`);
    }
  });
});
