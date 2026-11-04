// @vitest-environment node
//
// Applies every migration in supabase/migrations to an in-memory Postgres
// (PGlite, Postgres compiled to WASM) and checks the triggers, functions and
// RLS policies they define. Supabase's auth schema and API roles are replaced
// by a minimal stand-in: auth.uid() reads the request.jwt.claim.sub setting,
// as Supabase's does, and `as(role, uid)` switches to that role and user.
//
// This catches SQL and policy mistakes in CI without Docker. It doesn't cover
// PostgREST or Supabase Auth themselves; test those against academy-staging.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = join(__dirname, "../../supabase/migrations");
const PHASE_2 = "20261104000000_cohorts_and_sessions.sql";

let db: PGlite;

const U = {
  admin: "00000000-0000-4000-8000-00000000000a",
  inst: "00000000-0000-4000-8000-00000000000b",
  inst2: "00000000-0000-4000-8000-00000000000c",
  s1: "00000000-0000-4000-8000-000000000001",
  s2: "00000000-0000-4000-8000-000000000002",
  s3: "00000000-0000-4000-8000-000000000003",
};
const K1 = "10000000-0000-4000-8000-000000000001"; // course 1, capacity 2, instructor inst
const K2 = "10000000-0000-4000-8000-000000000002"; // course 2, no limit, instructor inst2
const S1 = "20000000-0000-4000-8000-000000000001"; // session in K1
const S2 = "20000000-0000-4000-8000-000000000002"; // session in K2
let c1: string;
let c2: string;

type Who = { role: "anon" | "authenticated"; uid?: string };

/** Run SQL (as a superuser, or as an API role and user) and return the last statement's rows. */
async function sql<T = Record<string, unknown>>(text: string, who?: Who): Promise<T[]> {
  try {
    if (who) {
      await db.exec(`set role ${who.role}; select set_config('request.jwt.claim.sub', '${who.uid ?? ""}', false);`);
    }
    const results = await db.exec(text);
    return (results[results.length - 1]?.rows ?? []) as T[];
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

const as = (role: Who["role"], uid?: string): Who => ({ role, uid });

async function enrollmentId(user: string, course: string): Promise<string> {
  const [row] = await sql<{ id: string }>(
    `select id from public.enrollments where user_id = '${user}' and course_id = '${course}'`
  );
  return row.id;
}

const uuidArray = (ids: string[]) =>
  ids.length ? `array[${ids.map((i) => `'${i}'::uuid`).join(",")}]` : "array[]::uuid[]";

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb default '{}'::jsonb,
      email_confirmed_at timestamptz,
      confirmation_sent_at timestamptz
    );
    create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
}, 30_000);

afterAll(async () => {
  await db?.close();
});

describe("migrations", () => {
  it("apply in order to an empty database", async () => {
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
      await expect(db.exec(readFileSync(join(MIGRATIONS, file), "utf8")), file).resolves.toBeDefined();
    }
  });

  it("can re-run the Phase 2 migration", async () => {
    await expect(db.exec(readFileSync(join(MIGRATIONS, PHASE_2), "utf8"))).resolves.toBeDefined();
  });

  it("seed the course catalogue", async () => {
    const rows = await sql<{ id: string }>("select id from public.courses order by position");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    [c1, c2] = rows.map((r) => r.id);

    await sql(`
      insert into auth.users (id, email) values
        ('${U.admin}', 'admin@x.test'), ('${U.inst}', 'inst@x.test'), ('${U.inst2}', 'inst2@x.test'),
        ('${U.s1}', 's1@x.test'), ('${U.s2}', 's2@x.test'), ('${U.s3}', 's3@x.test');
      update public.profiles set role = 'admin' where id = '${U.admin}';
      update public.profiles set role = 'instructor' where id in ('${U.inst}', '${U.inst2}');
    `);
  });
});

describe("roles", () => {
  it("allow instructor and reject unknown roles", async () => {
    const [p] = await sql<{ role: string }>(`select role from public.profiles where id = '${U.inst}'`);
    expect(p.role).toBe("instructor");
    await expect(sql(`update public.profiles set role = 'teacher' where id = '${U.s1}'`)).rejects.toThrow(
      /profiles_role_check/
    );
  });

  it("stop students promoting themselves", async () => {
    await expect(
      sql(`update public.profiles set role = 'instructor' where id = '${U.s1}'`, as("authenticated", U.s1))
    ).rejects.toThrow(/Only admins can change roles/);
  });
});

describe("enrollments → courses", () => {
  it("reject enrolments in unknown courses", async () => {
    await expect(
      sql(`insert into public.enrollments (user_id, course_id) values ('${U.s1}', 'no-such-course')`)
    ).rejects.toThrow(/foreign key/);
  });

  it("validate the foreign key when existing rows allow it", async () => {
    const [c] = await sql<{ convalidated: boolean }>(
      "select convalidated from pg_constraint where conname = 'enrollments_course_id_fkey'"
    );
    expect(c.convalidated).toBe(true);
  });
});

describe("cohort placement", () => {
  beforeAll(async () => {
    await sql(`
      insert into public.enrollments (user_id, course_id) values
        ('${U.s1}', '${c1}'), ('${U.s2}', '${c1}'), ('${U.s3}', '${c1}'), ('${U.s1}', '${c2}');
      insert into public.cohorts (id, course_id, name, capacity, instructor_id, meeting_url) values
        ('${K1}', '${c1}', 'C1 evenings', 2, '${U.inst}', 'https://meet.example/c1'),
        ('${K2}', '${c2}', 'C2 weekends', null, '${U.inst2}', null);
    `);
  });

  it("keep courses with enrolments from being deleted", async () => {
    await expect(sql(`delete from public.courses where id = '${c1}'`)).rejects.toThrow(/foreign key/);
  });

  it("fill a cohort up to its capacity, then refuse", async () => {
    await sql(`update public.enrollments set cohort_id = '${K1}' where id = '${await enrollmentId(U.s1, c1)}'`);
    await sql(`update public.enrollments set cohort_id = '${K1}' where id = '${await enrollmentId(U.s2, c1)}'`);
    await expect(
      sql(`update public.enrollments set cohort_id = '${K1}' where id = '${await enrollmentId(U.s3, c1)}'`)
    ).rejects.toThrow(/Cohort is full/);
  });

  it("count every seat even when the caller's RLS hides some rows", async () => {
    await expect(
      sql(
        `update public.enrollments set cohort_id = '${K1}' where id = '${await enrollmentId(U.s3, c1)}'`,
        as("authenticated", U.admin)
      )
    ).rejects.toThrow(/Cohort is full/);
  });

  it("refuse a cohort of a different course", async () => {
    await expect(
      sql(`update public.enrollments set cohort_id = '${K2}' where id = '${await enrollmentId(U.s3, c1)}'`)
    ).rejects.toThrow(/different course/);
  });

  it("still allow other updates to learners in a full cohort", async () => {
    await expect(
      sql(`update public.enrollments set progress = 50 where id = '${await enrollmentId(U.s1, c1)}'`)
    ).resolves.toBeDefined();
  });

  it("place learners in a cohort without a limit", async () => {
    await expect(
      sql(`update public.enrollments set cohort_id = '${K2}' where id = '${await enrollmentId(U.s1, c2)}'`)
    ).resolves.toBeDefined();
  });
});

describe("sessions and attendance", () => {
  beforeAll(async () => {
    await sql(`
      insert into public.class_sessions (id, cohort_id, starts_at, duration_min) values
        ('${S1}', '${K1}', now() + interval '1 day', 60),
        ('${S2}', '${K2}', now() + interval '1 day', 60);
      insert into public.attendance (session_id, user_id, status) values
        ('${S1}', '${U.s1}', 'present'), ('${S1}', '${U.s2}', 'absent');
    `);
  });

  it("enforce the column checks", async () => {
    await expect(
      sql(`insert into public.attendance (session_id, user_id, status) values ('${S1}', '${U.s3}', 'excused')`)
    ).rejects.toThrow(/check/);
    await expect(
      sql(`insert into public.class_sessions (cohort_id, starts_at, duration_min) values ('${K1}', now(), 0)`)
    ).rejects.toThrow(/check/);
    await expect(
      sql(
        `insert into public.cohorts (course_id, name, starts_on, ends_on) values ('${c1}', 'bad', '2027-02-01', '2027-01-01')`
      )
    ).rejects.toThrow(/check/);
  });
});

describe("RLS: anon", () => {
  it("can read the lesson outline but not lesson content", async () => {
    expect(await sql("select title from public.lessons limit 1", as("anon"))).toHaveLength(1);
    await expect(sql("select content from public.lessons limit 1", as("anon"))).rejects.toThrow(/permission denied/);
    await expect(sql("select video_url from public.lessons limit 1", as("anon"))).rejects.toThrow(/permission denied/);
    await expect(sql("select * from public.lessons limit 1", as("anon"))).rejects.toThrow(/permission denied/);
  });

  it("sees no cohorts, sessions or attendance", async () => {
    expect(await sql("select * from public.cohorts", as("anon"))).toHaveLength(0);
    expect(await sql("select * from public.class_sessions", as("anon"))).toHaveLength(0);
    expect(await sql("select * from public.attendance", as("anon"))).toHaveLength(0);
  });
});

describe("RLS: students", () => {
  it("see only their own cohorts", async () => {
    const rows = await sql<{ id: string }>("select id from public.cohorts", as("authenticated", U.s2));
    expect(rows.map((r) => r.id)).toEqual([K1]);
  });

  it("can't read class sessions (meeting links come from the join route)", async () => {
    expect(await sql("select * from public.class_sessions", as("authenticated", U.s1))).toHaveLength(0);
  });

  it("read only their own attendance and can't write it", async () => {
    const rows = await sql<{ user_id: string }>("select user_id from public.attendance", as("authenticated", U.s1));
    expect(rows.map((r) => r.user_id)).toEqual([U.s1]);
    await expect(
      sql(
        `insert into public.attendance (session_id, user_id, status) values ('${S1}', '${U.s3}', 'present')`,
        as("authenticated", U.s1)
      )
    ).rejects.toThrow(/row-level security/);
  });
});

describe("RLS: instructors", () => {
  it("see only their own cohorts' sessions", async () => {
    const rows = await sql<{ cohort_id: string }>("select cohort_id from public.class_sessions", as("authenticated", U.inst));
    expect(rows.map((r) => r.cohort_id)).toEqual([K1]);
  });

  it("can set links on their own sessions only", async () => {
    const mine = await sql(
      `update public.class_sessions set recording_url = 'https://rec.example/1' where id = '${S1}' returning id`,
      as("authenticated", U.inst)
    );
    expect(mine).toHaveLength(1);
    const theirs = await sql(
      `update public.class_sessions set recording_url = 'x' where id = '${S2}' returning id`,
      as("authenticated", U.inst)
    );
    expect(theirs).toHaveLength(0);
  });

  it("can't schedule sessions", async () => {
    await expect(
      sql(`insert into public.class_sessions (cohort_id, starts_at) values ('${K1}', now())`, as("authenticated", U.inst))
    ).rejects.toThrow(/row-level security/);
  });

  it("can mark attendance in their own cohort only", async () => {
    const rows = await sql(
      `insert into public.attendance (session_id, user_id, status) values ('${S1}', '${U.s3}', 'late') returning user_id`,
      as("authenticated", U.inst)
    );
    expect(rows).toHaveLength(1);
    await expect(
      sql(
        `insert into public.attendance (session_id, user_id, status) values ('${S2}', '${U.s1}', 'present')`,
        as("authenticated", U.inst)
      )
    ).rejects.toThrow(/row-level security/);
  });
});

describe("reordering", () => {
  let modules: string[];

  beforeAll(async () => {
    modules = (
      await sql<{ id: string }>(`select id from public.course_modules where course_id = '${c1}' order by position`)
    ).map((r) => r.id);
  });

  it("reorders a course's modules to positions 1..n", async () => {
    expect(modules.length).toBeGreaterThanOrEqual(2);
    const reversed = [...modules].reverse();
    await sql(`select public.reorder_course_modules('${c1}', ${uuidArray(reversed)})`);
    const rows = await sql<{ id: string; position: number }>(
      `select id, position from public.course_modules where course_id = '${c1}' order by position`
    );
    expect(rows.map((r) => r.id)).toEqual(reversed);
    expect(rows.map((r) => r.position)).toEqual(reversed.map((_, i) => i + 1));
    modules = reversed;
  });

  it("rejects lists that don't match the course exactly", async () => {
    const dup = [modules[0], modules[0], ...modules.slice(2)];
    await expect(sql(`select public.reorder_course_modules('${c1}', ${uuidArray(dup)})`)).rejects.toThrow(
      /does not match/
    );
    await expect(sql(`select public.reorder_course_modules('${c1}', ${uuidArray([modules[0]])})`)).rejects.toThrow(
      /does not match/
    );
    await expect(sql(`select public.reorder_course_modules('${c2}', ${uuidArray(modules)})`)).rejects.toThrow(
      /does not match/
    );
  });

  it("reorders a module's lessons", async () => {
    const lessons = (
      await sql<{ id: string }>(`select id from public.lessons where module_id = '${modules[0]}' order by position`)
    ).map((r) => r.id);
    expect(lessons.length).toBeGreaterThanOrEqual(2);
    const rotated = [...lessons.slice(1), lessons[0]];
    await sql(`select public.reorder_lessons('${modules[0]}', ${uuidArray(rotated)})`);
    const rows = await sql<{ id: string }>(
      `select id from public.lessons where module_id = '${modules[0]}' order by position`
    );
    expect(rows.map((r) => r.id)).toEqual(rotated);
  });

  it("is only callable with the service role", async () => {
    await expect(
      sql(`select public.reorder_lessons('${modules[0]}', ${uuidArray([])})`, as("authenticated", U.admin))
    ).rejects.toThrow(/permission denied/);
  });
});

describe("deleting a cohort", () => {
  it("un-assigns its learners and removes its sessions", async () => {
    const enr = await enrollmentId(U.s1, c2);
    await sql(`delete from public.cohorts where id = '${K2}'`);
    const [e] = await sql<{ cohort_id: string | null }>(`select cohort_id from public.enrollments where id = '${enr}'`);
    expect(e.cohort_id).toBeNull();
    const [n] = await sql<{ n: number }>(`select count(*)::int as n from public.class_sessions where cohort_id = '${K2}'`);
    expect(n.n).toBe(0);
  });
});
