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

// ─── Phase 3: billing ───

describe("billing", () => {
  let offering: string;
  let plan: string;
  const T0 = "2026-11-05T10:00:00Z";

  const order = (txRef: string, user: string, course = c1) =>
    sql(`
      insert into public.orders (user_id, customer_email, kind, course_id, offering_id, plan_id, currency, amount, tx_ref)
      values ('${user}', 'Learner@X.test', 'subscription', '${course}', '${offering}', '${plan}', 'NGN', 50000, '${txRef}')
    `);
  const fulfil = async (txRef: string, flwId: number, paidAt = T0) =>
    (
      await sql<{ r: { outcome: string; subscription_id: string; enrollment_id: string } }>(
        `select public.fulfil_subscription_order('${txRef}', ${flwId}, 50000, '${paidAt}') as r`
      )
    )[0].r;

  beforeAll(async () => {
    [{ id: offering }] = await sql<{ id: string }>(
      `select id from public.offerings where course_id = '${c2}' and kind = 'cohort_group'`
    );
    [{ id: plan }] = await sql<{ id: string }>(`
      insert into public.payment_plans (offering_id, currency, amount, flw_plan_id)
      values ('${offering}', 'NGN', 50000, 9001) returning id
    `);
    // Plans can only reference offerings of the same course in practice; the
    // tests below use c2's offering with orders for c2.
  });

  it("tags enrolments made with scholarship codes", async () => {
    const [{ n }] = await sql<{ n: number }>(
      "select count(*)::int as n from public.enrollments where source not in ('manual', 'code', 'purchase', 'subscription')"
    );
    expect(n).toBe(0);
  });

  it("enrols a new learner on the first charge, once", async () => {
    await order("sub_first", U.s2, c2);
    const first = await fulfil("sub_first", 111);
    expect(first.outcome).toBe("enrolled");

    const [sub] = await sql<{ status: string; current_period_end: Date; customer_email: string }>(
      `select status, current_period_end, customer_email from public.subscriptions where id = '${first.subscription_id}'`
    );
    expect(sub.status).toBe("active");
    expect(sub.customer_email).toBe("learner@x.test");
    expect(new Date(sub.current_period_end).toISOString()).toBe("2026-12-05T10:00:00.000Z");

    const [enr] = await sql<{ source: string; subscription_id: string; status: string }>(
      `select source, subscription_id, status from public.enrollments where user_id = '${U.s2}' and course_id = '${c2}'`
    );
    expect(enr).toMatchObject({ source: "subscription", subscription_id: first.subscription_id, status: "active" });

    expect((await fulfil("sub_first", 111)).outcome).toBe("duplicate");
    const [{ n }] = await sql<{ n: number }>(
      `select count(*)::int as n from public.subscriptions where user_id = '${U.s2}' and course_id = '${c2}'`
    );
    expect(n).toBe(1);
  });

  it("records a second purchase by someone who already has access as already_enrolled", async () => {
    await order("sub_again", U.s2, c2);
    const r = await fulfil("sub_again", 112);
    expect(r.outcome).toBe("already_enrolled");
    const [sub] = await sql<{ status: string }>(`select status from public.subscriptions where id = '${r.subscription_id}'`);
    expect(sub.status).toBe("cancelled");
  });

  it("treats manual and code enrolments as existing access", async () => {
    // U.s1 has a manual enrolment in c2 from the cohort tests.
    await order("sub_manual", U.s1, c2);
    expect((await fulfil("sub_manual", 113)).outcome).toBe("already_enrolled");
  });

  it("rejects unknown orders", async () => {
    await expect(fulfil("sub_nope", 114)).rejects.toThrow(/Unknown order/);
  });

  it("extends the period on renewal, idempotently", async () => {
    const [{ id }] = await sql<{ id: string }>(
      `select id from public.subscriptions where first_tx_ref = 'sub_first'`
    );
    const renew = async (flwId: number, paidAt: string) =>
      (
        await sql<{ r: { outcome: string } }>(
          `select public.record_renewal('${id}', 'flw-renewal', ${flwId}, 50000, '${paidAt}') as r`
        )
      )[0].r.outcome;

    expect(await renew(211, "2026-12-05T09:00:00Z")).toBe("renewed");
    expect(await renew(211, "2026-12-05T09:00:00Z")).toBe("duplicate");
    const [sub] = await sql<{ current_period_end: Date }>(
      `select current_period_end from public.subscriptions where id = '${id}'`
    );
    expect(new Date(sub.current_period_end).toISOString()).toBe("2027-01-05T10:00:00.000Z");

    // A late payment counts from the payment date, not the lapsed period end.
    expect(await renew(212, "2027-02-01T00:00:00Z")).toBe("renewed");
    const [later] = await sql<{ current_period_end: Date }>(
      `select current_period_end from public.subscriptions where id = '${id}'`
    );
    expect(new Date(later.current_period_end).toISOString()).toBe("2027-03-01T00:00:00.000Z");

    const [{ n }] = await sql<{ n: number }>(
      `select count(*)::int as n from public.orders where subscription_id = '${id}' and is_renewal and status = 'paid'`
    );
    expect(n).toBe(2);
  });

  it("expires lapsed subscriptions after the grace period and pauses the seat", async () => {
    const [{ id }] = await sql<{ id: string }>(`select id from public.subscriptions where first_tx_ref = 'sub_first'`);
    // Paid until 2027-03-01; grace is 3 days. The first sweep only expires
    // the two duplicate subscriptions cancelled above (paid until 2026-12-05).
    expect((await sql<{ n: number }>(`select public.expire_subscriptions('2027-03-03T00:00:00Z') as n`))[0].n).toBe(2);
    const [still] = await sql<{ status: string }>(`select status from public.subscriptions where id = '${id}'`);
    expect(still.status).toBe("active");
    expect((await sql<{ n: number }>(`select public.expire_subscriptions('2027-03-05T00:00:00Z') as n`))[0].n).toBe(1);

    const [sub] = await sql<{ status: string }>(`select status from public.subscriptions where id = '${id}'`);
    expect(sub.status).toBe("expired");
    const [enr] = await sql<{ status: string }>(`select status from public.enrollments where subscription_id = '${id}'`);
    expect(enr.status).toBe("paused");
  });

  it("resumes the same enrolment when the learner subscribes again", async () => {
    await order("sub_back", U.s2, c2);
    const r = await fulfil("sub_back", 115, "2027-04-01T00:00:00Z");
    expect(r.outcome).toBe("reactivated");
    const [enr] = await sql<{ status: string; subscription_id: string }>(
      `select status, subscription_id from public.enrollments where user_id = '${U.s2}' and course_id = '${c2}'`
    );
    expect(enr).toEqual({ status: "active", subscription_id: r.subscription_id });
  });

  it("allows only one live subscription per learner and course", async () => {
    await expect(
      sql(`
        insert into public.subscriptions (user_id, course_id, offering_id, plan_id, currency, amount, customer_email, first_tx_ref, current_period_end)
        values ('${U.s2}', '${c2}', '${offering}', '${plan}', 'NGN', 50000, 'x', 'sub_dupe', now())
      `)
    ).rejects.toThrow(/subscriptions_one_live_per_course/);
  });

  it("refunding a first charge cancels the subscription and pauses the seat", async () => {
    const [o] = await sql<{ id: string; subscription_id: string }>(
      `select id, subscription_id from public.orders where tx_ref = 'sub_back'`
    );
    await sql(`select public.mark_order_refunded('${o.id}')`);
    const [sub] = await sql<{ status: string }>(`select status from public.subscriptions where id = '${o.subscription_id}'`);
    expect(sub.status).toBe("expired");
    const [enr] = await sql<{ status: string }>(`select status from public.enrollments where subscription_id = '${o.subscription_id}'`);
    expect(enr.status).toBe("paused");
    await expect(sql(`select public.mark_order_refunded('${o.id}')`)).rejects.toThrow(/Only paid orders/);
    expect((await fulfil("sub_back", 115)).outcome).toBe("refunded");
  });

  it("lets learners read only their own orders and subscriptions", async () => {
    const mine = await sql<{ user_id: string }>("select user_id from public.orders", as("authenticated", U.s2));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((o) => o.user_id === U.s2)).toBe(true);
    const subs = await sql<{ user_id: string }>("select user_id from public.subscriptions", as("authenticated", U.s3));
    expect(subs).toHaveLength(0);
    expect(await sql("select * from public.payment_events", as("authenticated", U.s2))).toHaveLength(0);
    await expect(
      sql(`update public.orders set status = 'paid' where user_id = '${U.s2}' returning id`, as("authenticated", U.s2))
    ).resolves.toHaveLength(0);
  });

  it("keeps the billing functions away from API clients", async () => {
    await expect(
      sql(`select public.expire_subscriptions()`, as("authenticated", U.admin))
    ).rejects.toThrow(/permission denied/);
  });
});

describe("course addresses", () => {
  const redirects = async (id: string) =>
    (
      await sql<{ slug: string }>(`select slug from public.course_slug_redirects where course_id = '${id}' order by slug`)
    ).map((r) => r.slug);

  it("start out as the course ID", async () => {
    const rows = await sql<{ n: number }>("select count(*)::int as n from public.courses where slug <> id");
    expect(rows[0].n).toBe(0);
  });

  it("keep the old address as a redirect when one changes", async () => {
    await sql(`update public.courses set slug = '${c1}-new' where id = '${c1}'`);
    const [course] = await sql<{ id: string; slug: string }>(`select id, slug from public.courses where id = '${c1}'`);
    expect(course).toEqual({ id: c1, slug: `${c1}-new` });
    expect(await redirects(c1)).toEqual([c1]);

    await sql(`update public.courses set slug = '${c1}-newer' where id = '${c1}'`);
    expect(await redirects(c1)).toEqual([c1, `${c1}-new`]);
  });

  it("stop redirecting an address that is live again", async () => {
    await sql(`update public.courses set slug = '${c1}' where id = '${c1}'`);
    expect(await redirects(c1)).toEqual([`${c1}-new`, `${c1}-newer`]);

    // A new course taking another course's old address gets it outright.
    await sql(`insert into public.courses (id, slug, title) values ('fresh', '${c1}-new', 'Fresh')`);
    expect(await redirects(c1)).toEqual([`${c1}-newer`]);
    await sql(`delete from public.courses where id = 'fresh'`);
  });

  it("refuse an address another course has, or a badly formed one", async () => {
    await expect(sql(`update public.courses set slug = '${c2}' where id = '${c1}'`)).rejects.toThrow(/courses_slug_key/);
    await expect(sql(`update public.courses set slug = 'Has Spaces' where id = '${c1}'`)).rejects.toThrow(
      /courses_slug_format/
    );
  });

  it("don't touch enrolments, which keep the internal ID", async () => {
    const before = await sql<{ n: number }>(`select count(*)::int as n from public.enrollments where course_id = '${c1}'`);
    await sql(`update public.courses set slug = '${c1}-moved' where id = '${c1}'`);
    const after = await sql<{ n: number }>(`select count(*)::int as n from public.enrollments where course_id = '${c1}'`);
    expect(after[0].n).toBe(before[0].n);
    await sql(`update public.courses set slug = '${c1}' where id = '${c1}'`);
  });

  it("are readable by anyone for published courses only, and written only by the trigger", async () => {
    await sql(`update public.courses set is_published = true where id = '${c1}'`);
    const anon = await sql<{ slug: string }>("select slug from public.course_slug_redirects", as("anon"));
    expect(anon.map((r) => r.slug)).toContain(`${c1}-moved`);

    await sql(`update public.courses set is_published = false where id = '${c1}'`);
    const hidden = await sql<{ slug: string }>("select slug from public.course_slug_redirects", as("anon"));
    expect(hidden.map((r) => r.slug)).not.toContain(`${c1}-moved`);
    const admin = await sql<{ slug: string }>("select slug from public.course_slug_redirects", as("authenticated", U.admin));
    expect(admin.map((r) => r.slug)).toContain(`${c1}-moved`);
    await sql(`update public.courses set is_published = true where id = '${c1}'`);

    await expect(
      sql(`insert into public.course_slug_redirects (slug, course_id) values ('hijack', '${c2}')`, as("authenticated", U.admin))
    ).rejects.toThrow(/row-level security/);
  });
});

describe("contact messages", () => {
  const ID = "30000000-0000-4000-8000-000000000001";

  beforeAll(async () => {
    await sql(`insert into public.contact_messages (id, name, email, phone, course, message)
      values ('${ID}', 'Ada', 'ada@x.test', '08012345678', 'General inquiry', 'Hello there')`);
  });

  it("start as new and only allow known statuses", async () => {
    const [m] = await sql<{ status: string; email_sent: boolean }>(`select status, email_sent from public.contact_messages where id = '${ID}'`);
    expect(m).toEqual({ status: "new", email_sent: false });
    await expect(sql(`update public.contact_messages set status = 'odd' where id = '${ID}'`)).rejects.toThrow(/check constraint/);
  });

  it("are readable by admins only", async () => {
    expect(await sql("select id from public.contact_messages", as("authenticated", U.admin))).toHaveLength(1);
    expect(await sql("select id from public.contact_messages", as("authenticated", U.s1))).toHaveLength(0);
    expect(await sql("select id from public.contact_messages", as("anon"))).toHaveLength(0);
  });

  it("can't be written by API clients, even admins", async () => {
    await expect(
      sql(`insert into public.contact_messages (name, email, phone, course, message) values ('x','x@x.test','1','c','m')`, as("anon"))
    ).rejects.toThrow(/row-level security/);
    await expect(
      sql(`update public.contact_messages set status = 'handled' where id = '${ID}' returning id`, as("authenticated", U.admin))
    ).resolves.toHaveLength(0);
  });
});

describe("lesson progress", () => {
  const COURSE = "progress-course";
  const M = "40000000-0000-4000-8000-000000000001";
  const L = [1, 2, 3, 4].map((n) => `41000000-0000-4000-8000-00000000000${n}`);
  const COHORT = "42000000-0000-4000-8000-000000000001";
  const SESSION = "43000000-0000-4000-8000-000000000001";
  const SESSION2 = "43000000-0000-4000-8000-000000000002";
  const STUDENT = "00000000-0000-4000-8000-0000000000d1";
  const STUDENT2 = "00000000-0000-4000-8000-0000000000d2";
  const progress = async (u = STUDENT) =>
    (await sql<{ progress: number }>(`select progress from public.enrollments where user_id = '${u}' and course_id = '${COURSE}'`))[0].progress;
  const complete = (lesson: string, u = STUDENT) => sql(`insert into public.lesson_progress (user_id, lesson_id) values ('${u}', '${lesson}')`);
  const undo = (lesson: string, u = STUDENT) => sql(`delete from public.lesson_progress where user_id = '${u}' and lesson_id = '${lesson}'`);

  beforeAll(async () => {
    await sql(`
      insert into auth.users (id, email) values ('${STUDENT}', 'p1@x.test'), ('${STUDENT2}', 'p2@x.test');
      insert into public.courses (id, slug, title, is_published) values ('${COURSE}', '${COURSE}', 'Progress', true);
      insert into public.course_modules (id, course_id, title, position) values ('${M}', '${COURSE}', 'M', 1);
      insert into public.lessons (id, module_id, title, position, type) values
        ('${L[0]}', '${M}', 'Text', 1, 'text'), ('${L[1]}', '${M}', 'Video', 2, 'video'),
        ('${L[2]}', '${M}', 'Live A', 3, 'live'), ('${L[3]}', '${M}', 'Live B', 4, 'live');
      insert into public.cohorts (id, course_id, name) values ('${COHORT}', '${COURSE}', 'P');
      insert into public.enrollments (user_id, course_id, cohort_id) values ('${STUDENT}', '${COURSE}', '${COHORT}');
      insert into public.enrollments (user_id, course_id, progress_baseline) values ('${STUDENT2}', '${COURSE}', 40);
      insert into public.class_sessions (id, cohort_id, lesson_id, starts_at, duration_min) values
        ('${SESSION}', '${COHORT}', '${L[2]}', now() - interval '2 days', 60),
        ('${SESSION2}', '${COHORT}', null, now() - interval '1 day', 60);
    `);
  });

  it("starts from the credit an enrolment already has", async () => {
    expect(await progress()).toBe(0);
    expect(await progress(STUDENT2)).toBe(40);
  });

  it("moves with completed lessons, and back when undone", async () => {
    await complete(L[0]);
    expect(await progress()).toBe(25);
    await complete(L[1]);
    expect(await progress()).toBe(50);
    await undo(L[1]);
    expect(await progress()).toBe(25);
  });

  it("builds on a starting credit and only reaches 100 when everything is done", async () => {
    await complete(L[0], STUDENT2);
    expect(await progress(STUDENT2)).toBe(55);
    await complete(L[1], STUDENT2);
    await complete(L[2], STUDENT2);
    expect(await progress(STUDENT2)).toBe(85);
    await complete(L[3], STUDENT2);
    expect(await progress(STUDENT2)).toBe(100);
  });

  it("counts attending the class that teaches a lesson", async () => {
    await sql(`insert into public.attendance (session_id, user_id, status) values ('${SESSION}', '${STUDENT}', 'present')`);
    expect(await progress()).toBe(50);
  });

  it("doesn't double count a lesson both attended and marked complete", async () => {
    await complete(L[2]);
    expect(await progress()).toBe(50);
    await undo(L[2]);
  });

  it("counts other attended classes towards the remaining live lessons", async () => {
    await sql(`insert into public.attendance (session_id, user_id, status) values ('${SESSION2}', '${STUDENT}', 'late')`);
    expect(await progress()).toBe(75);
  });

  it("drops the credit when attendance is corrected to absent", async () => {
    await sql(`update public.attendance set status = 'absent' where session_id = '${SESSION2}' and user_id = '${STUDENT}'`);
    expect(await progress()).toBe(50);
  });

  it("recalculates everyone when the course's lessons change", async () => {
    await sql(`update public.lessons set is_published = false where id = '${L[3]}'`);
    expect(await progress()).toBe(66);
    await sql(`update public.lessons set is_published = true where id = '${L[3]}'`);
    expect(await progress()).toBe(50);
    expect(await progress(STUDENT2)).toBe(100);
  });

  it("recalculates when a class is deleted", async () => {
    await sql(`delete from public.class_sessions where id = '${SESSION}'`);
    expect(await progress()).toBe(25);
  });

  it("recalculates when a learner leaves their cohort", async () => {
    await sql(`insert into public.class_sessions (id, cohort_id, lesson_id, starts_at, duration_min) values ('${SESSION}', '${COHORT}', '${L[2]}', now(), 60);
      insert into public.attendance (session_id, user_id, status) values ('${SESSION}', '${STUDENT}', 'present')`);
    expect(await progress()).toBe(50);
    await sql(`update public.enrollments set cohort_id = null where user_id = '${STUDENT}' and course_id = '${COURSE}'`);
    expect(await progress()).toBe(25);
  });

  it("recalculates when a lesson or a whole module is deleted", async () => {
    await sql(`delete from public.lessons where id = '${L[3]}'`);
    expect(await progress()).toBe(33);
    await sql(`delete from public.course_modules where id = '${M}'`);
    expect(await progress()).toBe(0);
    expect(await progress(STUDENT2)).toBe(40);
  });

  it("lets learners read only their own, and no client write", async () => {
    const lesson = (await sql<{ id: string }>("select id from public.lessons limit 1"))[0].id;
    await complete(lesson, U.s1);
    expect(await sql("select lesson_id from public.lesson_progress", as("authenticated", U.s1))).toHaveLength(1);
    expect(await sql("select lesson_id from public.lesson_progress", as("authenticated", U.s2))).toHaveLength(0);
    expect(await sql("select lesson_id from public.lesson_progress", as("anon"))).toHaveLength(0);
    await expect(
      sql(`insert into public.lesson_progress (user_id, lesson_id) values ('${U.s2}', '${lesson}')`, as("authenticated", U.s2))
    ).rejects.toThrow(/row-level security/);
  });

  it("keeps the calculation away from API clients", async () => {
    await expect(sql(`select public.refresh_progress_for_course('${c1}')`, as("authenticated", U.admin))).rejects.toThrow(/permission denied/);
  });
});

describe("course resources", () => {
  beforeAll(async () => {
    await sql(`insert into public.course_resources (course_id, title, kind, url) values ('${c1}', 'Guide', 'link', 'https://x.test')`);
  });

  it("need the matching file or link", async () => {
    await expect(
      sql(`insert into public.course_resources (course_id, title, kind) values ('${c1}', 'Bad', 'file')`)
    ).rejects.toThrow(/check constraint/);
  });

  it("can't be read directly by any API client", async () => {
    expect(await sql("select id from public.course_resources", as("anon"))).toHaveLength(0);
    expect(await sql("select id from public.course_resources", as("authenticated", U.s1))).toHaveLength(0);
  });
});

describe("lesson blocks", () => {
  const FILE = "20261110000000_lesson_blocks.sql";
  const M = "50000000-0000-4000-8000-000000000001";
  const L = "51000000-0000-4000-8000-000000000001";
  const OLD = "51000000-0000-4000-8000-000000000002";
  const blocks = async (id = L) =>
    sql<{ position: number; kind: string; title: string | null; content: string | null; video_url: string | null; file_path: string | null }>(
      `select position, kind, title, content, video_url, file_path from public.lesson_blocks where lesson_id = '${id}' order by position`
    );
  const replace = async (value: unknown[], id = L) => {
    const [row] = await sql<{ unused: string[] }>(
      `select public.replace_lesson_blocks('${id}', '${JSON.stringify(value)}'::jsonb) as unused`
    );
    return row.unused;
  };

  beforeAll(async () => {
    await sql(`
      insert into public.course_modules (id, course_id, title, position) values ('${M}', '${c2}', 'Blocks', 900);
      insert into public.lessons (id, module_id, title, position) values ('${L}', '${M}', 'Mixed', 1);
      insert into public.lessons (id, module_id, title, position, content, video_url, file_path)
        values ('${OLD}', '${M}', 'Old', 2, 'Old text', 'https://youtu.be/abcdefg', 'lessons/old.pdf');
    `);
  });

  it("carries over an existing lesson once, in the order the player showed it", async () => {
    const migration = readFileSync(join(MIGRATIONS, FILE), "utf8");
    await db.exec(migration);
    await db.exec(migration);
    const rows = await blocks(OLD);
    expect(rows.map((b) => [b.position, b.kind])).toEqual([[1, "video"], [2, "file"], [3, "text"]]);
    expect(rows[1].file_path).toBe("lessons/old.pdf");
  });

  it("holds several of each kind, in the order given", async () => {
    await replace([
      { kind: "text", content: "Intro" },
      { kind: "video", video_url: "https://youtu.be/one", title: "Cap" },
      { kind: "file", file_path: "lessons/a.pdf" },
      { kind: "text", content: "More" },
      { kind: "video", video_url: "https://youtu.be/two" },
    ]);
    const rows = await blocks();
    expect(rows.map((b) => b.position)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((b) => b.kind)).toEqual(["text", "video", "file", "text", "video"]);
    expect(rows[1].title).toBe("Cap");
  });

  it("reports only the files no longer used", async () => {
    await replace([{ kind: "file", file_path: "lessons/a.pdf" }, { kind: "file", file_path: "lessons/b.pdf" }]);
    expect(await replace([{ kind: "file", file_path: "lessons/b.pdf" }])).toEqual(["lessons/a.pdf"]);
    expect(await replace([])).toEqual(["lessons/b.pdf"]);
    expect(await blocks()).toHaveLength(0);
  });

  it("changes nothing if any block is invalid", async () => {
    await replace([{ kind: "text", content: "Keep me" }]);
    await expect(replace([{ kind: "text", content: "Fine" }, { kind: "video" }])).rejects.toThrow(/check constraint/);
    expect((await blocks()).map((b) => b.content)).toEqual(["Keep me"]);
  });

  it("refuses an unknown lesson", async () => {
    await expect(replace([], "59999999-0000-4000-8000-000000000000")).rejects.toThrow(/Unknown lesson/);
  });

  it("go with their lesson", async () => {
    await sql(`delete from public.lessons where id = '${OLD}'`);
    expect(await blocks(OLD)).toHaveLength(0);
  });

  it("can't be read or changed by any API client", async () => {
    expect(await sql("select id from public.lesson_blocks", as("anon"))).toHaveLength(0);
    expect(await sql("select id from public.lesson_blocks", as("authenticated", U.admin))).toHaveLength(0);
    await expect(sql(`select public.replace_lesson_blocks('${L}', '[]'::jsonb)`, as("authenticated", U.admin))).rejects.toThrow(/permission denied/);
  });
});

describe("self-paced subscriptions", () => {
  let OFFER: string;
  let GROUP: string;
  const MONTHLY = "61000000-0000-4000-8000-000000000001";
  const YEARLY = "61000000-0000-4000-8000-000000000002";
  const GROUP_PLAN = "61000000-0000-4000-8000-000000000003";
  const COHORT = "62000000-0000-4000-8000-000000000001";
  const L1 = "00000000-0000-4000-8000-0000000000e1";
  const L2 = "00000000-0000-4000-8000-0000000000e2";
  const L3 = "00000000-0000-4000-8000-0000000000e3";
  const PAID = "2026-11-05T10:00:00+00:00";
  let flw = 9000;

  async function checkout(user: string, plan: string, offering: string, ref: string) {
    await sql(`insert into public.orders (user_id, customer_email, kind, course_id, offering_id, plan_id, currency, amount, tx_ref)
      values ('${user}', 'x@x.test', 'subscription', '${c2}', '${offering}', '${plan}', 'USD', 10, '${ref}')`);
    const [row] = await sql<{ r: { outcome: string; subscription_id: string } }>(
      `select public.fulfil_subscription_order('${ref}', ${++flw}, 10, '${PAID}') as r`
    );
    return row.r;
  }
  const periodEnd = async (id: string) =>
    (await sql<{ e: string }>(`select to_char(current_period_end at time zone 'utc', 'YYYY-MM-DD') e from public.subscriptions where id = '${id}'`))[0].e;

  beforeAll(async () => {
    [{ id: OFFER }] = await sql<{ id: string }>(`
      insert into public.offerings (course_id, kind, price_usd, price_ngn, yearly_price_usd, yearly_price_ngn)
      values ('${c2}', 'self_paced', 10, 15000, 100, 150000)
      on conflict (course_id, kind) do update set yearly_price_usd = 100, yearly_price_ngn = 150000
      returning id
    `);
    [{ id: GROUP }] = await sql<{ id: string }>(`select id from public.offerings where course_id = '${c2}' and kind = 'cohort_group'`);
    await sql(`
      insert into auth.users (id, email) values ('${L1}', 'l1@x.test'), ('${L2}', 'l2@x.test'), ('${L3}', 'l3@x.test');
      insert into public.payment_plans (id, offering_id, currency, amount, "interval", flw_plan_id) values
        ('${MONTHLY}', '${OFFER}', 'USD', 10, 'monthly', 81),
        ('${YEARLY}', '${OFFER}', 'USD', 100, 'yearly', 82),
        ('${GROUP_PLAN}', '${GROUP}', 'USD', 50, 'monthly', 83);
      insert into public.cohorts (id, course_id, name) values ('${COHORT}', '${c2}', 'Earlier');
    `);
  });

  it("gives a yearly plan a year, and a monthly plan a month", async () => {
    const yearly = await checkout(L1, YEARLY, OFFER, "sp_yearly");
    expect(yearly.outcome).toBe("enrolled");
    expect(await periodEnd(yearly.subscription_id)).toBe("2027-11-05");
    const monthly = await checkout(L2, MONTHLY, OFFER, "sp_monthly");
    expect(await periodEnd(monthly.subscription_id)).toBe("2026-12-05");
  });

  it("extends a yearly renewal by a year, once", async () => {
    const [{ id }] = await sql<{ id: string }>(`select id from public.subscriptions where first_tx_ref = 'sp_yearly'`);
    const renew = () => sql<{ r: { outcome: string } }>(`select public.record_renewal('${id}', 'rv', 7777, 100, '2027-11-05T09:00:00+00:00') as r`);
    expect((await renew())[0].r.outcome).toBe("renewed");
    expect(await periodEnd(id)).toBe("2028-11-05");
    expect((await renew())[0].r.outcome).toBe("duplicate");
    expect(await periodEnd(id)).toBe("2028-11-05");
  });

  it("keeps self-paced enrolments out of cohorts", async () => {
    const [e] = await sql<{ cohort_id: string | null; source: string }>(
      `select cohort_id, source from public.enrollments where user_id = '${L1}' and course_id = '${c2}'`
    );
    expect(e).toEqual({ cohort_id: null, source: "subscription" });
  });

  it("frees a cohort seat when a lapsed learner comes back as self-paced", async () => {
    const seat = await checkout(L3, GROUP_PLAN, GROUP, "sp_seat");
    await sql(`update public.enrollments set cohort_id = '${COHORT}' where user_id = '${L3}' and course_id = '${c2}'`);
    await sql(`update public.subscriptions set status = 'expired' where id = '${seat.subscription_id}'`);
    await sql(`update public.enrollments set status = 'paused' where user_id = '${L3}' and course_id = '${c2}'`);

    expect((await checkout(L3, MONTHLY, OFFER, "sp_back")).outcome).toBe("reactivated");
    const [e] = await sql<{ cohort_id: string | null; status: string }>(
      `select cohort_id, status from public.enrollments where user_id = '${L3}' and course_id = '${c2}'`
    );
    expect(e).toEqual({ cohort_id: null, status: "active" });
  });

  it("keeps the cohort when a lapsed learner buys a live seat again", async () => {
    await sql(`update public.subscriptions set status = 'expired' where user_id = '${L3}';
      update public.enrollments set cohort_id = '${COHORT}', status = 'paused' where user_id = '${L3}' and course_id = '${c2}'`);
    expect((await checkout(L3, GROUP_PLAN, GROUP, "sp_seat2")).outcome).toBe("reactivated");
    const [e] = await sql<{ cohort_id: string | null }>(`select cohort_id from public.enrollments where user_id = '${L3}' and course_id = '${c2}'`);
    expect(e.cohort_id).toBe(COHORT);
  });

  it("refuses unknown intervals and non-positive yearly prices", async () => {
    await expect(
      sql(`insert into public.payment_plans (offering_id, currency, amount, "interval", flw_plan_id) values ('${OFFER}', 'USD', 5, 'weekly', 84)`)
    ).rejects.toThrow(/check constraint/);
    await expect(sql(`update public.offerings set yearly_price_usd = 0 where id = '${OFFER}'`)).rejects.toThrow(/check constraint/);
  });

  it("keeps the period function away from API clients", async () => {
    await expect(sql(`select public.plan_period('${YEARLY}')`, as("authenticated", U.admin))).rejects.toThrow(/permission denied/);
  });
});

describe("shared recordings", () => {
  it("start unshared, including recordings that already exist", async () => {
    const K = "70000000-0000-4000-8000-000000000001";
    const S = "71000000-0000-4000-8000-000000000001";
    await sql(`
      insert into public.cohorts (id, course_id, name) values ('${K}', '${c1}', 'Rec');
      insert into public.class_sessions (id, cohort_id, starts_at, duration_min, recording_url)
        values ('${S}', '${K}', now(), 60, 'https://rec.test/1');
    `);
    const [row] = await sql<{ shared_with_self_paced: boolean }>(`select shared_with_self_paced from public.class_sessions where id = '${S}'`);
    expect(row.shared_with_self_paced).toBe(false);
    const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.class_sessions where shared_with_self_paced");
    expect(n).toBe(0);
  });
});
