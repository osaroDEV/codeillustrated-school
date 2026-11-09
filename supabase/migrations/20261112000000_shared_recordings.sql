-- Self-paced subscribers only see the class recordings an admin has chosen to
-- share. Recordings can show learners, some of them children, so nothing is
-- shared by default. Cohort learners still see their own cohort's recordings.

alter table public.class_sessions
  add column if not exists shared_with_self_paced boolean not null default false;
